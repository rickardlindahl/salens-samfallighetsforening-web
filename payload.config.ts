import path from "node:path";
import { fileURLToPath } from "node:url";
import { admins } from "@/lib/payload/access/admins";
import { adminsAndUser } from "@/lib/payload/access/adminsAndUser";
import { checkRole } from "@/lib/payload/access/checkRole";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { buildConfig } from "payload";
import { en } from "payload/i18n/en";
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

export default buildConfig({
  editor: lexicalEditor(),
  collections: [
    {
      slug: "users",
      auth: {
        tokenExpiration: 60 * 60 * 8, // 8 hours
        verify: process.env.NODE_ENV === "production", // Require email verification before being allowed to authenticate
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
          hooks: {
            beforeChange: [
              async ({ req, value, operation }) => {
                if (operation !== "update") {
                  return value;
                }
                // Make sure a non-admin user can't change role to admin

                const isAdmin = req.user?.role === "admin";

                if (!isAdmin) {
                  return "user";
                }

                return value;
              },
            ],
          },
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
          name: "slug",
          type: "text",
          hooks: {
            beforeChange: [
              async ({ value, data }) => {
                // return formatted version of title if exists, else return unmodified value
                return data?.title?.replace(/ /g, "-").toLowerCase() ?? value;
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
        },
        {
          name: "content",
          type: "richText",
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
    supportedLanguages: { en },
  },

  admin: {
    autoLogin: {
      email: "dev@payloadcms.com",
      password: "test",
      prefillOnly: true,
    },
  },
  async onInit(payload) {
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
