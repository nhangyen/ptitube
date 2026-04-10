-- Extend moderation_actions.action enum-like check to support "reviewed"
ALTER TABLE moderation_actions
DROP CONSTRAINT IF EXISTS moderation_actions_action_check;

ALTER TABLE moderation_actions
ADD CONSTRAINT moderation_actions_action_check
CHECK (
    action IN ('approve', 'reject', 'revise_tags', 'flag', 'escalate', 'ban', 'reviewed')
);
