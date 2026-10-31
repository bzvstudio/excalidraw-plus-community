UPDATE "accounts" SET "access_token" = NULL, "refresh_token" = NULL, "id_token" = NULL WHERE "provider_id" <> 'credential';
