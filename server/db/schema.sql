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
-- PostgreSQL database dump complete
--

\unrestrict KoJDkNPJ0AaHgINahOaybc9ZpRkZmcEdVSfWuRIMJbkPBT0rjoCqt65uHj1YU2I

