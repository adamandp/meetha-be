-- Test fixture copied from existing DB definitions. Never applied by application startup.
CREATE TABLE "public"."asr_models" (
  "version" text COLLATE "pg_catalog"."default",
  "model_path" text COLLATE "pg_catalog"."default",
  "scorer_path" text COLLATE "pg_catalog"."default",
  "text_replacement_path" text COLLATE "pg_catalog"."default",
  "createdon" timestamptz DEFAULT NOW() NOT NULL,
  "id" serial NOT NULL
);

CREATE TABLE "public"."attendance" (
  "path_audio_recognize" text COLLATE "pg_catalog"."default",
  "sample_embedding" bytea,
  "nip" text COLLATE "pg_catalog"."default",
  "nama" text COLLATE "pg_catalog"."default" NOT NULL,
  "jenis_kelamin" text COLLATE "pg_catalog"."default",
  "tempat_lahir" text COLLATE "pg_catalog"."default",
  "tanggal_lahir" text COLLATE "pg_catalog"."default",
  "kewarganegaraan" text COLLATE "pg_catalog"."default",
  "agama" text COLLATE "pg_catalog"."default",
  "pekerjaan" text COLLATE "pg_catalog"."default",
  "pendidikan" text COLLATE "pg_catalog"."default",
  "jabatan" text COLLATE "pg_catalog"."default",
  "alamat" text COLLATE "pg_catalog"."default",
  "createdby" text COLLATE "pg_catalog"."default" NOT NULL,
  "createdon" timestamptz DEFAULT NOW() NOT NULL,
  "updatedby" text COLLATE "pg_catalog"."default" NOT NULL,
  "updatedon" timestamptz DEFAULT NOW() NOT NULL,
  "deletedby" text COLLATE "pg_catalog"."default",
  "deletedon" text COLLATE "pg_catalog"."default",
  "id" serial NOT NULL,
  "datausername" varchar(50) COLLATE "pg_catalog"."default",
  "data_user_uuid" varchar(50) COLLATE "pg_catalog"."default"
);

CREATE TABLE "public"."chunk_table" (
  "id_audio" int4,
  "transcript" text COLLATE "pg_catalog"."default",
  "speaker" text COLLATE "pg_catalog"."default",
  "path_audio" text COLLATE "pg_catalog"."default",
  "id" serial NOT NULL
);

CREATE TABLE "public"."event" (
  "id" serial NOT NULL,
  "chatbot_uuid" text COLLATE "pg_catalog"."default",
  "agenda_id" int4,
  "event_kind_id" int4,
  "event_group_id" int4,
  "event_type_id" int4,
  "satuan_kerja_id" int4,
  "case_number" text COLLATE "pg_catalog"."default",
  "event_number" text COLLATE "pg_catalog"."default",
  "ref_event_number" text COLLATE "pg_catalog"."default",
  "location" text COLLATE "pg_catalog"."default",
  "agenda" text COLLATE "pg_catalog"."default",
  "description" text COLLATE "pg_catalog"."default",
  "timestart" timestamptz NOT NULL,
  "timeend" timestamptz,
  "status" int4 NOT NULL,
  "sync_status" int4 NOT NULL,
  "import_status" int4 NULL,
  "import_message" varchar(255) COLLATE "pg_catalog"."default",
  "subject" text COLLATE "pg_catalog"."default",
  "loading" int4 NOT NULL,
  "uploading" int4 NOT NULL,
  "status_process_chunk" int4 NOT NULL,
  "pembicara" int4,
  "partisipan" int4,
  "other_person" int4,
  "total_segment" int4,
  "duration_sec" float8 DEFAULT 0,
  "third_party_key_1" text,
  "third_party_key_2" text,
  "third_party_key_3" text,
  "long_summary" text COLLATE "pg_catalog"."default",
  "real_transcript_path" text COLLATE "pg_catalog"."default",
  "subtitle_file_path" text COLLATE "pg_catalog"."default",
  "revised_transcript_path" text COLLATE "pg_catalog"."default",
  "json_file_path" text COLLATE "pg_catalog"."default",
  "audio_folder_path" text COLLATE "pg_catalog"."default",
  "json_transcript_file_path" text COLLATE "pg_catalog"."default",
  "zip_file_path" text COLLATE "pg_catalog"."default",
  "audio_file_path" text COLLATE "pg_catalog"."default",
  "csv_file_path" text COLLATE "pg_catalog"."default",
  "import_file_path" text COLLATE "pg_catalog"."default",
  "createdby" text COLLATE "pg_catalog"."default" NOT NULL,
  "createdon" timestamptz DEFAULT NOW() NOT NULL,
  "updatedby" text COLLATE "pg_catalog"."default" NOT NULL,
  "updatedon" timestamptz DEFAULT NOW() NOT NULL,
  "language" text COLLATE "pg_catalog"."default" NOT NULL,
  "datausername" varchar(50) COLLATE "pg_catalog"."default",
  "data_user_uuid" varchar(50) COLLATE "pg_catalog"."default"
);

CREATE TABLE "public"."event_agenda" (
  "event_type_id" int4 NOT NULL,
  "name" text COLLATE "pg_catalog"."default" NOT NULL,
  "status" int4 NOT NULL,
  "createdby" text COLLATE "pg_catalog"."default" NOT NULL,
  "createdon" timestamptz DEFAULT NOW() NOT NULL,
  "updatedby" text COLLATE "pg_catalog"."default" NOT NULL,
  "updatedon" timestamptz DEFAULT NOW() NOT NULL,
  "id" serial NOT NULL,
  "datausername" varchar(50) COLLATE "pg_catalog"."default",
  "data_user_uuid" varchar(50) COLLATE "pg_catalog"."default"
);

CREATE TABLE "public"."event_attendance" (
  "event_id" int4 NOT NULL,
  "event_role_id" int4 NOT NULL,
  "attendance_id" int4,
  "device_id" int4,
  "name" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "image" text COLLATE "pg_catalog"."default",
  "priority" int4,
  "status" int4 NOT NULL,
  "status_type" text COLLATE "pg_catalog"."default",
  "createdby" text COLLATE "pg_catalog"."default" NOT NULL,
  "createdon" timestamptz DEFAULT NOW() NOT NULL,
  "updatedby" text COLLATE "pg_catalog"."default" NOT NULL,
  "updatedon" timestamptz DEFAULT NOW() NOT NULL,
  "id" serial NOT NULL,
  "datausername" varchar(50) COLLATE "pg_catalog"."default",
  "data_user_uuid" varchar(50) COLLATE "pg_catalog"."default"
);

CREATE TABLE "public"."event_group" (
  "name" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "image" text COLLATE "pg_catalog"."default",
  "status" int4 NOT NULL,
  "createdby" text COLLATE "pg_catalog"."default" NOT NULL,
  "createdon" timestamptz DEFAULT NOW() NOT NULL,
  "updatedby" text COLLATE "pg_catalog"."default" NOT NULL,
  "updatedon" timestamptz DEFAULT NOW() NOT NULL,
  "id" serial NOT NULL,
  "datausername" varchar(50) COLLATE "pg_catalog"."default",
  "data_user_uuid" varchar(50) COLLATE "pg_catalog"."default"
);

CREATE TABLE "public"."event_kind" (
  "event_type_id" int4 NOT NULL,
  "name" text COLLATE "pg_catalog"."default" NOT NULL,
  "status" int4 NOT NULL,
  "createdby" text COLLATE "pg_catalog"."default" NOT NULL,
  "createdon" timestamptz DEFAULT NOW() NOT NULL,
  "updatedby" text COLLATE "pg_catalog"."default" NOT NULL,
  "updatedon" timestamptz DEFAULT NOW() NOT NULL,
  "id" serial NOT NULL,
  "datausername" varchar(50) COLLATE "pg_catalog"."default",
  "data_user_uuid" varchar(50) COLLATE "pg_catalog"."default"
);

CREATE TABLE "public"."event_role" (
  "event_group_id" int4 NOT NULL,
  "ref_event_type_id" int4,
  "name" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "priority" int4 NOT NULL,
  "status" int4 NOT NULL,
  "required" int4 NOT NULL,
  "createdby" text COLLATE "pg_catalog"."default" NOT NULL,
  "createdon" timestamptz DEFAULT NOW() NOT NULL,
  "updatedby" text COLLATE "pg_catalog"."default" NOT NULL,
  "updatedon" timestamptz DEFAULT NOW() NOT NULL,
  "id" serial NOT NULL,
  "datausername" varchar(50) COLLATE "pg_catalog"."default",
  "data_user_uuid" varchar(50) COLLATE "pg_catalog"."default"
);

CREATE TABLE "public"."event_transcript" (
  "event_id" int4 NOT NULL,
  "attendance_id" int4,
  "message_id" text COLLATE "pg_catalog"."default",
  "attendance" text COLLATE "pg_catalog"."default" NOT NULL,
  "speaker" text COLLATE "pg_catalog"."default",
  "status" int4 NOT NULL,
  "start" float8,
  "stop" float8,
  "duration" float8,
  "title" text COLLATE "pg_catalog"."default" NOT NULL,
  "transcript" text COLLATE "pg_catalog"."default" NOT NULL,
  "highlight" text COLLATE "pg_catalog"."default",
  "similarity" text COLLATE "pg_catalog"."default",
  "word_length" int4,
  "audio_path" text COLLATE "pg_catalog"."default",
  "createdon" timestamptz DEFAULT NOW() NOT NULL,
  "id" serial NOT NULL,
  "datausername" varchar(50) COLLATE "pg_catalog"."default",
  "data_user_uuid" varchar(50) COLLATE "pg_catalog"."default"
);

CREATE TABLE "public"."event_type" (
  "name" text COLLATE "pg_catalog"."default" NOT NULL,
  "status" int4 NOT NULL,
  "createdby" text COLLATE "pg_catalog"."default" NOT NULL,
  "createdon" timestamptz DEFAULT NOW() NOT NULL,
  "updatedby" text COLLATE "pg_catalog"."default" NOT NULL,
  "updatedon" timestamptz DEFAULT NOW() NOT NULL,
  "id" serial NOT NULL,
  "datausername" varchar(50) COLLATE "pg_catalog"."default",
  "data_user_uuid" varchar(50) COLLATE "pg_catalog"."default"
);

CREATE TABLE "public"."role" (
  "name" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "image" text COLLATE "pg_catalog"."default",
  "priority" int4 NOT NULL,
  "event_role" int4 NOT NULL,
  "status" int4 NOT NULL,
  "createdby" text COLLATE "pg_catalog"."default" NOT NULL,
  "createdon" timestamptz DEFAULT NOW() NOT NULL,
  "updatedby" text COLLATE "pg_catalog"."default" NOT NULL,
  "updatedon" timestamptz DEFAULT NOW() NOT NULL,
  "id" serial NOT NULL,
  "datausername" varchar(50) COLLATE "pg_catalog"."default",
  "data_user_uuid" varchar(50) COLLATE "pg_catalog"."default"
);

CREATE TABLE "public"."log_summary" (
  "event_id" int4,
  "long_summary" text COLLATE "pg_catalog"."default",
  "created_by" text COLLATE "pg_catalog"."default",
  "created_on" text COLLATE "pg_catalog"."default",
  "updated_by" text COLLATE "pg_catalog"."default",
  "updated_on" text COLLATE "pg_catalog"."default",
  "id" serial NOT NULL,
  "datausername" varchar(50) COLLATE "pg_catalog"."default",
  "data_user_uuid" varchar(50) COLLATE "pg_catalog"."default"
);

CREATE TABLE "public"."lookup" (
  "id" serial NOT NULL,
  "lookupkey" text COLLATE "pg_catalog"."default" NOT NULL,
  "lookupvalue" text COLLATE "pg_catalog"."default" NOT NULL,
  "lookupdesc" text COLLATE "pg_catalog"."default",
  "url" text COLLATE "pg_catalog"."default" NOT NULL,
  "status" int4 NOT NULL,
  "createdby" text COLLATE "pg_catalog"."default" NOT NULL,
  "createdon" timestamptz DEFAULT NOW() NOT NULL,
  "updatedby" text COLLATE "pg_catalog"."default" NOT NULL,
  "updatedon" timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE "public"."menu" (
  "id" serial NOT NULL,
  "menu_category_id" int4 NOT NULL,
  "parentid" int4 NOT NULL,
  "name" text COLLATE "pg_catalog"."default" NOT NULL,
  "url" text COLLATE "pg_catalog"."default",
  "icon" text COLLATE "pg_catalog"."default",
  "priority" int4 NOT NULL,
  "status" int4 NOT NULL,
  "createdby" text COLLATE "pg_catalog"."default" NOT NULL,
  "createdon" timestamptz DEFAULT NOW() NOT NULL,
  "updatedby" text COLLATE "pg_catalog"."default" NOT NULL,
  "updatedon" timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE "public"."menu_category" (
  "id" serial NOT NULL,
  "name" text COLLATE "pg_catalog"."default" NOT NULL,
  "priority" int4 NOT NULL,
  "status" int4 NOT NULL,
  "createdby" text COLLATE "pg_catalog"."default" NOT NULL,
  "createdon" timestamptz DEFAULT NOW() NOT NULL,
  "updatedby" text COLLATE "pg_catalog"."default" NOT NULL,
  "updatedon" timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE "public"."satker" (
  "id" serial NOT NULL,
  "id_parent" int4,
  "kode_satker" text COLLATE "pg_catalog"."default",
  "kode_provinsi" text COLLATE "pg_catalog"."default",
  "provinsi" text COLLATE "pg_catalog"."default",
  "city" text COLLATE "pg_catalog"."default",
  "lat" text COLLATE "pg_catalog"."default",
  "long" text COLLATE "pg_catalog"."default",
  "wilayah" text COLLATE "pg_catalog"."default",
  "nama_satker" text COLLATE "pg_catalog"."default" NOT NULL,
  "tipe_satker" text COLLATE "pg_catalog"."default" NOT NULL,
  "telp_satker" text COLLATE "pg_catalog"."default",
  "website_satker" text COLLATE "pg_catalog"."default",
  "alamat_satker" text COLLATE "pg_catalog"."default",
  "kategori_satker" text COLLATE "pg_catalog"."default",
  "created_at" text COLLATE "pg_catalog"."default",
  "updated_at" text COLLATE "pg_catalog"."default"
);

CREATE TABLE "public"."text_replacement" (
  "id" serial NOT NULL,
  "origin" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "replace" varchar(255) COLLATE "pg_catalog"."default" NOT NULL
);

CREATE TABLE "public"."tr_models" (
  "id" serial NOT NULL,
  "text_replacement_version" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "text_replacement_path" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "createdon" timestamptz DEFAULT NOW() NOT NULL
);

CREATE TABLE "public"."user" (
  "id" serial NOT NULL,
  "role_id" int8 NOT NULL,
  "username" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "user_uuid" varchar(255) COLLATE "pg_catalog"."default",
  "satker_id" int8,
  "fullname" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "password" varchar(255) COLLATE "pg_catalog"."default" NULL,
  "email" varchar(255) COLLATE "pg_catalog"."default" NULL,
  "user_type" int2 DEFAULT 1 NOT NULL,
  "status" int2 NOT NULL,
  "createdby" text COLLATE "pg_catalog"."default" NOT NULL,
  "createdon" timestamptz DEFAULT NOW() NOT NULL,
  "updatedby" text COLLATE "pg_catalog"."default" NOT NULL,
  "updatedon" timestamptz DEFAULT NOW() NOT NULL
);
ALTER TABLE "user" ADD PRIMARY KEY (id);
ALTER TABLE role ADD PRIMARY KEY (id);
