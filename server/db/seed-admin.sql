-- Seeds a single default admin account so the admin frontend is usable out
-- of the box in local/dev environments (docker-compose, or a first-boot k8s
-- Postgres). Runs after 01-schema.sql via the official Postgres image's
-- /docker-entrypoint-initdb.d/ convention (numeric prefix controls order),
-- and only on an empty data directory — same bootstrap approach as the
-- schema itself (see ARCHITECTURE.md).
--
-- Login:   username = admin   /   email = admin@shoppal.local
-- Password: Admin123!   (bcrypt hash below, 10 rounds — matches the
--                         BCRYPT_HASH_LENGTH default used by `server`)
--
-- CHANGE THIS PASSWORD before using this seed anywhere beyond a local demo.
INSERT INTO public."Admin" (
    user_id,
    email,
    name_details,
    gender,
    phone,
    username,
    password,
    birthday,
    avatar,
    address,
    admin_since
) VALUES (
    public.uuid_generate_v4(),
    'admin@shoppal.local',
    '(Admin,User,)',
    'other',
    NULL,
    'admin',
    '$2b$10$DsU8sawwSPO8gsT.R9jQUOezHBoJRVitlTGFy5xtiLB7LXxqBT49u',
    NULL,
    NULL,
    '(,,)',
    CURRENT_DATE
)
ON CONFLICT DO NOTHING;
