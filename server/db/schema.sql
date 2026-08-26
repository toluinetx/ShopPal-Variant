--
-- PostgreSQL database dump
--

\restrict KoJDkNPJ0AaHgINahOaybc9ZpRkZmcEdVSfWuRIMJbkPBT0rjoCqt65uHj1YU2I

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: Admin_gender_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Admin_gender_enum" AS ENUM (
    'male',
    'female',
    'other'
);


--
-- Name: Order_order_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Order_order_status_enum" AS ENUM (
    'arrived',
    'purchased',
    'delivering'
);


--
-- Name: Product_category_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Product_category_enum" AS ENUM (
    'beauty',
    'fragrances',
    'furniture',
    'groceries',
    'home-decoration',
    'kitchen-accessories',
    'laptops',
    'mens-shirts',
    'mens-shoes',
    'mens-watches',
    'mobile-accessories',
    'motorcycle',
    'skin-care',
    'smartphones',
    'sports-accessories',
    'sunglasses',
    'tablets',
    'tops',
    'vehicle',
    'womens-bags',
    'womens-dresses',
    'womens-jewellery',
    'womens-shoes',
    'womens-watches'
);


--
-- Name: User_gender_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."User_gender_enum" AS ENUM (
    'male',
    'female',
    'other'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Admin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Admin" (
    user_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    name_details text NOT NULL,
    gender public."Admin_gender_enum" NOT NULL,
    phone text,
    username text NOT NULL,
    password text NOT NULL,
    birthday date,
    avatar text,
    address text NOT NULL,
    admin_since date NOT NULL
);


--
-- Name: Cart; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Cart" (
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL
);


--
-- Name: Order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Order" (
    order_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    issued_time date NOT NULL,
    order_status public."Order_order_status_enum" NOT NULL,
    billing_info text,
    delivery_address text NOT NULL
);


--
-- Name: OrderProductLink; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderProductLink" (
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL
);


--
-- Name: OrderUserLink; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderUserLink" (
    order_id uuid NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: Product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Product" (
    product_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    description text,
    category public."Product_category_enum" NOT NULL,
    price real NOT NULL,
    rating real NOT NULL,
    stock integer NOT NULL,
    images text[],
    thumbnail text,
    brand text,
    return_policy text,
    shipping_info text,
    warranty_info text,
    dimension text
);


--
-- Name: Review; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Review" (
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating real NOT NULL,
    comment text NOT NULL,
    date date NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    user_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    name_details text NOT NULL,
    gender public."User_gender_enum" NOT NULL,
    phone text,
    username text NOT NULL,
    password text NOT NULL,
    birthday date,
    avatar text,
    address text NOT NULL
);


--
-- Name: OrderUserLink PK_5805eb214c009e01d0c0c60c686; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderUserLink"
    ADD CONSTRAINT "PK_5805eb214c009e01d0c0c60c686" PRIMARY KEY (order_id, user_id);


--
-- Name: Product PK_88e34a2a8ebfe028a62350c0a79; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "PK_88e34a2a8ebfe028a62350c0a79" PRIMARY KEY (product_id);


--
-- Name: Cart PK_912057d49a8546f86a4f92c977c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cart"
    ADD CONSTRAINT "PK_912057d49a8546f86a4f92c977c" PRIMARY KEY (user_id, product_id);


--
-- Name: Admin PK_9f3044efa6d7a6cbda03d5c186f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Admin"
    ADD CONSTRAINT "PK_9f3044efa6d7a6cbda03d5c186f" PRIMARY KEY (user_id);


--
-- Name: Order PK_9f34c73293ac98f27b3f43187b4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "PK_9f34c73293ac98f27b3f43187b4" PRIMARY KEY (order_id);


--
-- Name: User PK_af4be3eb77a4bdbafac6f808ff3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "PK_af4be3eb77a4bdbafac6f808ff3" PRIMARY KEY (user_id);


--
-- Name: OrderProductLink PK_b79e7457d16b6c4ac7a1fe289f6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderProductLink"
    ADD CONSTRAINT "PK_b79e7457d16b6c4ac7a1fe289f6" PRIMARY KEY (order_id, product_id);


--
-- Name: Review PK_da0d4c7f635ec999d1c807c5698; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "PK_da0d4c7f635ec999d1c807c5698" PRIMARY KEY (product_id, user_id);


--
-- Name: User UQ_29a05908a0fa0728526d2833657; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "UQ_29a05908a0fa0728526d2833657" UNIQUE (username);


--
-- Name: User UQ_4a257d2c9837248d70640b3e36e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "UQ_4a257d2c9837248d70640b3e36e" UNIQUE (email);


--
-- Name: Admin UQ_e6f9369e99cf2ac55215b667ffa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Admin"
    ADD CONSTRAINT "UQ_e6f9369e99cf2ac55215b667ffa" UNIQUE (username);


--
-- Name: Admin UQ_fca5840681c3854ea15e03e4a2b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Admin"
    ADD CONSTRAINT "UQ_fca5840681c3854ea15e03e4a2b" UNIQUE (email);


--
-- Name: OrderUserLink FK_12aa736a91a677d3d3fe04d5953; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderUserLink"
    ADD CONSTRAINT "FK_12aa736a91a677d3d3fe04d5953" FOREIGN KEY (user_id) REFERENCES public."User"(user_id);


--
-- Name: Review FK_275c4ea9d0bbe1f59988a452635; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "FK_275c4ea9d0bbe1f59988a452635" FOREIGN KEY (product_id) REFERENCES public."Product"(product_id);


--
-- Name: OrderProductLink FK_ab95e411a676b96416c37022f61; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderProductLink"
    ADD CONSTRAINT "FK_ab95e411a676b96416c37022f61" FOREIGN KEY (order_id) REFERENCES public."Order"(order_id);


--
-- Name: OrderProductLink FK_b42f1ece0aee6bf0b3374b34dc7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderProductLink"
    ADD CONSTRAINT "FK_b42f1ece0aee6bf0b3374b34dc7" FOREIGN KEY (product_id) REFERENCES public."Product"(product_id);


--
-- Name: Cart FK_ba68075b027b0e91ac17b0a640e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cart"
    ADD CONSTRAINT "FK_ba68075b027b0e91ac17b0a640e" FOREIGN KEY (product_id) REFERENCES public."Product"(product_id);


--
-- Name: OrderUserLink FK_ce13561288507497825fb41d459; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderUserLink"
    ADD CONSTRAINT "FK_ce13561288507497825fb41d459" FOREIGN KEY (order_id) REFERENCES public."Order"(order_id);


--
-- Name: Review FK_f56d7c1bc44e2ae5aa53584f41a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "FK_f56d7c1bc44e2ae5aa53584f41a" FOREIGN KEY (user_id) REFERENCES public."User"(user_id);


--
-- Name: Cart FK_fdca14193d9766891f94430460f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cart"
    ADD CONSTRAINT "FK_fdca14193d9766891f94430460f" FOREIGN KEY (user_id) REFERENCES public."User"(user_id);


--
-- Extended schema: new tables added for wishlist, address book, saved payment
-- methods, coupons, order tracking, product Q&A, recently viewed, and in-app
-- notification inbox. These extend the base commerce API to support deeper
-- chained user workflows (wishlist -> move to cart -> apply coupon ->
-- checkout with saved address & payment -> place order -> tracking timeline
-- -> notifications -> reorder).
--

--
-- New enum types
--

CREATE TYPE public."Coupon_type_enum" AS ENUM (
    'percentage',
    'flat'
);

CREATE TYPE public."OrderTracking_status_enum" AS ENUM (
    'order_placed',
    'payment_confirmed',
    'processing',
    'packed',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled'
);

CREATE TYPE public."UserNotification_type_enum" AS ENUM (
    'order_placed',
    'order_status_changed',
    'order_cancelled',
    'wishlist_price_drop',
    'wishlist_back_in_stock',
    'question_answered',
    'coupon_issued',
    'review_reply',
    'general'
);

--
-- Add extended columns to Order for coupon/discount/subtotal/payment method.
--

ALTER TABLE public."Order"
    ADD COLUMN IF NOT EXISTS coupon_code text,
    ADD COLUMN IF NOT EXISTS discount_amount real NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS subtotal real,
    ADD COLUMN IF NOT EXISTS total real,
    ADD COLUMN IF NOT EXISTS payment_method_id uuid;

--
-- Wishlist
--

CREATE TABLE IF NOT EXISTS public."Wishlist" (
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    added_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_Wishlist" PRIMARY KEY (user_id, product_id),
    CONSTRAINT "FK_Wishlist_user" FOREIGN KEY (user_id) REFERENCES public."User"(user_id) ON DELETE CASCADE,
    CONSTRAINT "FK_Wishlist_product" FOREIGN KEY (product_id) REFERENCES public."Product"(product_id) ON DELETE CASCADE
);

--
-- Saved addresses (address book)
--

CREATE TABLE IF NOT EXISTS public."SavedAddress" (
    address_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    label text NOT NULL,
    address text NOT NULL,
    recipient_name text,
    recipient_phone text,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_SavedAddress" PRIMARY KEY (address_id),
    CONSTRAINT "FK_SavedAddress_user" FOREIGN KEY (user_id) REFERENCES public."User"(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IDX_SavedAddress_user_id" ON public."SavedAddress" (user_id);

--
-- Payment methods (tokenized – only safe metadata)
--

CREATE TABLE IF NOT EXISTS public."PaymentMethod" (
    payment_method_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    label text NOT NULL,
    last_four text,
    brand text,
    holder_name text,
    exp_month integer,
    exp_year integer,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_PaymentMethod" PRIMARY KEY (payment_method_id),
    CONSTRAINT "FK_PaymentMethod_user" FOREIGN KEY (user_id) REFERENCES public."User"(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IDX_PaymentMethod_user_id" ON public."PaymentMethod" (user_id);

--
-- Coupons
--

CREATE TABLE IF NOT EXISTS public."Coupon" (
    coupon_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code text NOT NULL,
    description text,
    type public."Coupon_type_enum" NOT NULL,
    value real NOT NULL,
    min_order_total real NOT NULL DEFAULT 0,
    max_discount real,
    usage_limit integer,
    times_used integer NOT NULL DEFAULT 0,
    valid_from timestamptz,
    valid_until timestamptz,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_Coupon" PRIMARY KEY (coupon_id),
    CONSTRAINT "UQ_Coupon_code" UNIQUE (code)
);

--
-- Order tracking timeline
--

CREATE TABLE IF NOT EXISTS public."OrderTracking" (
    tracking_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    status public."OrderTracking_status_enum" NOT NULL,
    location text,
    message text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_OrderTracking" PRIMARY KEY (tracking_id),
    CONSTRAINT "FK_OrderTracking_order" FOREIGN KEY (order_id) REFERENCES public."Order"(order_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IDX_OrderTracking_order_id" ON public."OrderTracking" (order_id);

--
-- Product Q&A
--

CREATE TABLE IF NOT EXISTS public."ProductQuestion" (
    question_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ProductQuestion" PRIMARY KEY (question_id),
    CONSTRAINT "FK_ProductQuestion_product" FOREIGN KEY (product_id) REFERENCES public."Product"(product_id) ON DELETE CASCADE,
    CONSTRAINT "FK_ProductQuestion_user" FOREIGN KEY (user_id) REFERENCES public."User"(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IDX_ProductQuestion_product_id" ON public."ProductQuestion" (product_id);

CREATE TABLE IF NOT EXISTS public."ProductAnswer" (
    answer_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    question_id uuid NOT NULL,
    user_id uuid NOT NULL,
    body text NOT NULL,
    is_staff boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ProductAnswer" PRIMARY KEY (answer_id),
    CONSTRAINT "FK_ProductAnswer_question" FOREIGN KEY (question_id) REFERENCES public."ProductQuestion"(question_id) ON DELETE CASCADE,
    CONSTRAINT "FK_ProductAnswer_user" FOREIGN KEY (user_id) REFERENCES public."User"(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IDX_ProductAnswer_question_id" ON public."ProductAnswer" (question_id);

--
-- Recently viewed products
--

CREATE TABLE IF NOT EXISTS public."RecentlyViewed" (
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    viewed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_RecentlyViewed" PRIMARY KEY (user_id, product_id),
    CONSTRAINT "FK_RecentlyViewed_user" FOREIGN KEY (user_id) REFERENCES public."User"(user_id) ON DELETE CASCADE,
    CONSTRAINT "FK_RecentlyViewed_product" FOREIGN KEY (product_id) REFERENCES public."Product"(product_id) ON DELETE CASCADE
);

--
-- User notification inbox
--

CREATE TABLE IF NOT EXISTS public."UserNotification" (
    notification_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type public."UserNotification_type_enum" NOT NULL,
    title text NOT NULL,
    body text,
    metadata text,
    action_url text,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_UserNotification" PRIMARY KEY (notification_id),
    CONSTRAINT "FK_UserNotification_user" FOREIGN KEY (user_id) REFERENCES public."User"(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IDX_UserNotification_user_id" ON public."UserNotification" (user_id);
CREATE INDEX IF NOT EXISTS "IDX_UserNotification_user_unread" ON public."UserNotification" (user_id, is_read);

--
-- Seed a few starter coupons so the UI has something to show out of the box.
--

INSERT INTO public."Coupon" (code, description, type, value, min_order_total, max_discount, active)
VALUES
    ('WELCOME10', 'Welcome discount – 10% off any order', 'percentage', 10, 0, 30, true),
    ('SAVE5', '$5 off orders over $30', 'flat', 5, 30, NULL, true),
    ('BIGSPENDER', '20% off orders over $200 (max $50)', 'percentage', 20, 200, 50, true)
ON CONFLICT (code) DO NOTHING;

--
-- PostgreSQL database dump complete
--

\unrestrict KoJDkNPJ0AaHgINahOaybc9ZpRkZmcEdVSfWuRIMJbkPBT0rjoCqt65uHj1YU2I

