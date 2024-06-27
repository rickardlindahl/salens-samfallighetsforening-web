import path from "path";
// import { postgresAdapter } from '@payloadcms/db-postgres'
import { en } from "payload/i18n/en";
import {
	AlignFeature,
	BlockquoteFeature,
	BlocksFeature,
	BoldFeature,
	ChecklistFeature,
	HeadingFeature,
	IndentFeature,
	InlineCodeFeature,
	ItalicFeature,
	lexicalEditor,
	LinkFeature,
	OrderedListFeature,
	ParagraphFeature,
	RelationshipFeature,
	UnorderedListFeature,
	UploadFeature,
} from "@payloadcms/richtext-lexical";
//import { slateEditor } from '@payloadcms/richtext-slate'
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { buildConfig } from "payload";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { s3Storage } from "@payloadcms/storage-s3";

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
	//editor: slateEditor({}),
	editor: lexicalEditor(),
	collections: [
		{
			slug: "users",
			auth: true,
			access: {
				delete: () => false,
				update: () => false,
			},
			fields: [],
		},
		{
			slug: "pages",
			admin: {
				useAsTitle: "title",
			},
			fields: [
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
				media: true,
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
