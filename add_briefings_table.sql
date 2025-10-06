-- Table: public.briefings

-- DROP TABLE IF EXISTS public.briefings;

CREATE TABLE IF NOT EXISTS public.briefings
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    name character varying(255) COLLATE pg_catalog."default",
    briefing_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT briefings_pkey PRIMARY KEY (id),
    CONSTRAINT briefings_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.briefings
    OWNER to postgres;

ALTER TABLE IF EXISTS public.briefings
    ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.briefings TO anon;

GRANT ALL ON TABLE public.briefings TO authenticated;

GRANT ALL ON TABLE public.briefings TO postgres;

GRANT ALL ON TABLE public.briefings TO service_role;