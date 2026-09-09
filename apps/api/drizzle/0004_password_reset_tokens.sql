CREATE TABLE "password_reset_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "token_hash" varchar(128) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "password_reset_tokens_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "password_reset_tokens_hash_unique"
  ON "password_reset_tokens" USING btree ("token_hash");
CREATE INDEX "password_reset_tokens_user_created_idx"
  ON "password_reset_tokens" USING btree ("user_id", "created_at");
CREATE INDEX "password_reset_tokens_hash_expiry_idx"
  ON "password_reset_tokens" USING btree ("token_hash", "expires_at");
