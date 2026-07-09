/**
 * Data layer — picks its storage backend automatically:
 *
 *  - Supabase (permanent Postgres database) when SUPABASE_URL and
 *    SUPABASE_SERVICE_ROLE_KEY are set. Run supabase/schema.sql once in the
 *    Supabase SQL editor, add both values as environment variables, done.
 *
 *  - Otherwise, a zero-setup local store flushed to `.data/store.json`
 *    (perfect for development; ephemeral on serverless hosts).
 *
 * Both backends implement the exact same functions, so nothing else in the
 * app knows or cares which one is active.
 */
import * as fileStore from "./store-file";
import * as supabaseStore from "./store-supabase";

const useSupabase = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

const impl = useSupabase ? supabaseStore : fileStore;

export const createUser = impl.createUser;
export const findUserByEmail = impl.findUserByEmail;
export const getUserById = impl.getUserById;
export const updateUser = impl.updateUser;
export const deleteUser = impl.deleteUser;
export const createBusiness = impl.createBusiness;
export const listBusinessesByUser = impl.listBusinessesByUser;
export const getBusinessById = impl.getBusinessById;
export const createCampaign = impl.createCampaign;
export const listCampaignsByUser = impl.listCampaignsByUser;
export const updateCampaignStatus = impl.updateCampaignStatus;
export const createPasswordResetToken = impl.createPasswordResetToken;
export const consumePasswordResetToken = impl.consumePasswordResetToken;
