import path from "node:path";
import { fileURLToPath } from "node:url";
import { admins } from "@/lib/payload/access/admins";
import { adminsAndUser } from "@/lib/payload/access/adminsAndUser";
import { checkRole } from "@/lib/payload/access/checkRole";
import config from "@payload-config";
import type { User } from "@payload-types";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { nodemailerAdapter } from "@payloadcms/email-nodemailer";
import { getPayloadHMR } from "@payloadcms/next/utilities";
import {
  HTMLConverterFeature,
  lexicalEditor,
} from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import slugify from "@sindresorhus/slugify";
import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import type { CollectionAfterChangeHook } from "payload";
import { buildConfig } from "payload";
import { sv } from "payload/i18n/sv";
import sharp from "sharp";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const S3_BUCKET = process.env.S3_BUCKET;
if (!S3_BUCKET) {
  throw new Error("Missing environment variable S3_BUCKET");
}

const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
if (!S3_SECRET_ACCESS_KEY) {
  throw new Error("Missing environment variable S3_ACCESS_KEY_ID");
}

const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
if (!S3_ACCESS_KEY_ID) {
  throw new Error("Missing environment variable S3_ACCESS_KEY_ID");
}

const S3_ENDPOINT = process.env.S3_ENDPOINT;
if (!S3_ENDPOINT) {
  throw new Error("Missing environment variable S3_ENDPOINT");
}

function createEmailTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const sendEmail = async ({ to, subject, html }: Mail.Options) => {
  const transport = createEmailTransport();

  await transport.sendMail({
    from: {
      name: "Salens Samfällighetsförening",
      address: "info@salenssamfallighetsforening.se",
    },
    to,
    subject,
    html,
  });
};

const sendInviteEmailAfterUserCreated: CollectionAfterChangeHook<
  User
> = async ({ doc, operation }) => {
  // Only trigger the hook when creating a new user
  if (operation === "create") {
    // Generate the reset password token for the new user
    const payload = await getPayloadHMR({
      config,
    });
    const resetToken = await payload.forgotPassword({
      collection: "users",
      data: { email: doc.email },
      disableEmail: true, // Disable default Payload email so you can send a custom one
    });

    // Create a reset-password link with the generated token
    const resetPasswordUrl = `${process.env.NEXT_PUBLIC_PAYLOAD_URL}/reset-password?token=${resetToken}`;

    // Send the reset-password email
    await sendEmail({
      to: doc.email,
      subject: "Du har blivit inbjuden till Salens Samfällighetsförening",
      html: `
    <p>Hej ${doc.firstName},</p>
    <p>Du har blivit inbjuden till <strong>Salens Samfällighetsförening</strong>!</p>
    <p>För att komma igång behöver du skapa ett lösenord genom att klicka på länken nedan:</p>
    <p><a href="${resetPasswordUrl}" style="color: #1a73e8; text-decoration: none;">Skapa ditt lösenord</a></p>
    <p>Om du inte förväntade dig den här inbjudan kan du ignorera detta meddelande.</p>
    <p>Vänliga hälsningar,</p>
    <p>Salens Samfällighetsförening</p>
  `,
    });
  }
};

export default buildConfig({
  editor: lexicalEditor(),
  collections: [
    {
      slug: "users",
      auth: {
        tokenExpiration: 60 * 60 * 8, // 8 hours
        verify: false, // Require email verification before being allowed to authenticate
        cookies: {
          sameSite: "None",
          secure: true,
          domain: process.env.COOKIE_DOMAIN,
        },
      },
      access: {
        read: adminsAndUser,
        create: admins,
        update: adminsAndUser,
        delete: admins,
        admin: ({ req: { user } }) => checkRole("admin", user),
      },
      hooks: {
        afterChange: [sendInviteEmailAfterUserCreated],
      },
      labels: {
        singular: {
          en: "User",
          sv: "Användare",
        },
        plural: {
          en: "Users",
          sv: "Användare",
        },
      },
      fields: [
        {
          name: "firstName",
          type: "text",
          required: true,
          label: {
            en: "First name",
            sv: "Förnamn",
          },
        },
        {
          name: "lastName",
          type: "text",
          required: true,
          label: {
            en: "Last name",
            sv: "Efternamn",
          },
        },
        {
          name: "phoneNumber",
          type: "text",
          label: {
            en: "Phone number",
            sv: "Telefonnummer",
          },
        },
        {
          name: "role",
          type: "select",
          required: true,
          hasMany: false,
          saveToJWT: true,
          defaultValue: "user",
          options: [
            {
              label: "Admin",
              value: "admin",
            },
            {
              label: "User",
              value: "user",
            },
          ],
          label: {
            en: "Role",
            sv: "Roll",
          },
        },
      ],
    },
    {
      slug: "posts",
      admin: {
        useAsTitle: "title",
      },
      fields: [
        {
          name: "publishDate",
          type: "date",
          required: true,
          defaultValue: () => new Date(),
        },
        {
          name: "slug",
          type: "text",
          unique: true,
          hooks: {
            beforeChange: [
              async ({ data, originalDoc, operation, req }) => {
                // Ensure the hook only runs on create and update operations
                if (
                  !data ||
                  !data.title ||
                  (operation !== "create" && operation !== "update")
                ) {
                  return;
                }

                let slug = slugify(data.title || "");

                if (!slug) return;

                // If we are updating an existing post, we can skip uniqueness check if the title is unchanged
                if (operation === "update" && originalDoc.slug === slug) {
                  data.slug = slug;
                  return;
                }

                const existingPosts = await req.payload.find({
                  collection: "posts",
                  where: {
                    slug: {
                      equals: slug,
                    },
                  },
                });

                // If a post with the same slug exists, add a suffix until it's unique
                let suffix = 1;
                while (existingPosts.docs.length > 0) {
                  slug = `${slug}-${suffix}`;
                  suffix++;

                  const slugCheck = await req.payload.find({
                    collection: "posts",
                    where: {
                      slug: {
                        equals: slug,
                      },
                    },
                  });

                  if (slugCheck.docs.length === 0) {
                    break;
                  }
                }

                data.slug = slug;
              },
            ],
          },
          admin: {
            readOnly: true,
            position: "sidebar",
          },
        },
        {
          name: "title",
          type: "text",
          required: true,
        },
        {
          name: "content",
          type: "richText",
          required: true,
          editor: lexicalEditor({
            features: ({ defaultFeatures }) => [
              ...defaultFeatures,
              // The HTMLConverter Feature is the feature which manages the HTML serializers.
              // If you do not pass any arguments to it, it will use the default serializers.
              HTMLConverterFeature({}),
            ],
          }),
        },
      ],
    },
    {
      slug: "media",
      upload: true,
      fields: [
        {
          name: "text",
          type: "text",
        },
      ],
    },
    {
      slug: "documents",
      upload: true,
      fields: [
        {
          name: "date",
          type: "date",
          required: true,
        },
        {
          name: "description",
          type: "text",
          required: true,
        },
      ],
    },
  ],
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  // db: postgresAdapter({
  //   pool: {
  //     connectionString: process.env.POSTGRES_URI || ''
  //   }
  // }),
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || "",
  }),

  /**
   * Payload can now accept specific translations from 'payload/i18n/en'
   * This is completely optional and will default to English if not provided
   */
  i18n: {
    supportedLanguages: { sv },
  },

  admin: {
    autoLogin:
      process.env.NODE_ENV === "development"
        ? {
            email: "dev@payloadcms.com",
            password: "test",
            prefillOnly: true,
          }
        : false,
  },
  email: process.env.SMTP_HOST
    ? nodemailerAdapter({
        defaultFromAddress: "info@salenssamfallighetsforening.se",
        defaultFromName: "Salens Samfällighetsförening",
        // Any Nodemailer transport
        transport: createEmailTransport(),
      })
    : undefined,
  async onInit(payload) {
    if (process.env.NODE_ENV === "development") {
      const existingUsers = await payload.find({
        collection: "users",
        limit: 1,
      });

      if (existingUsers.docs.length === 0) {
        await payload.create({
          collection: "users",
          data: {
            email: "dev@payloadcms.com",
            password: "test",
            firstName: "Dev",
            lastName: "Eloper",
            role: "admin",
          },
        });
      }
    }
  },
  // Sharp is now an optional dependency -
  // if you want to resize images, crop, set focal point, etc.
  // make sure to install it and pass it to the config.

  // This is temporary - we may make an adapter pattern
  // for this before reaching 3.0 stable
  sharp,

  plugins: [
    s3Storage({
      collections: {
        media: {
          prefix: "/media",
        },
        documents: {
          prefix: "/documents",
        },
      },
      bucket: S3_BUCKET,
      config: {
        credentials: {
          accessKeyId: S3_ACCESS_KEY_ID,
          secretAccessKey: S3_SECRET_ACCESS_KEY,
        },
        // ... Other S3 configuration
        endpoint: S3_ENDPOINT,
        region: "eu-north-1",
        forcePathStyle: true,
      },
    }),
  ],
});
