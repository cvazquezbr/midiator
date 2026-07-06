ALTER TABLE linkedin_schedules ADD COLUMN IF NOT EXISTS notification_email VARCHAR(255);
COMMENT ON COLUMN linkedin_schedules.notification_email IS 'Email para receber notificações de publicação bem-sucedida.';
