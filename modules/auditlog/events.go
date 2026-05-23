package auditlog

const (
	ActionUserBan            = "user.ban"
	ActionUserUnban          = "user.unban"
	ActionUserDelete         = "user.delete"
	ActionUserSuspend        = "user.suspend"
	ActionUserUnsuspend      = "user.unsuspend"
	ActionUserWarn           = "user.warn"
	ActionUserPromote        = "user.promote"
	ActionUserDemote         = "user.demote"
	ActionUserForceLogout    = "user.force_logout"
	ActionUserKick           = "user.kick"
	ActionUserTimeout        = "user.timeout"
	ActionUserNickChange     = "user.nick_change"
	ActionUserPasswordChange = "user.password_change"
	ActionUserPasswordReset  = "user.password_reset"
	ActionUserKeyfileSet     = "user.keyfile_set"
	ActionUserKeyfileRotate  = "user.keyfile_rotate"
	ActionUserKeyfileRemove  = "user.keyfile_remove"
	ActionUserNewDeviceLogin = "user.new_device_login"
	ActionUserSessionRevoke  = "user.session_revoke"

	ActionGuildSettings         = "guild.settings_update"
	ActionGuildVanitySet        = "guild.vanity_set"
	ActionGuildVanityRemove     = "guild.vanity_remove"
	ActionGuildOwnerTransfer    = "guild.owner_transfer"
	ActionGuildBanAdd           = "guild.ban_add"
	ActionGuildBanRemove        = "guild.ban_remove"
	ActionGuildSuspend          = "guild.suspend"
	ActionGuildUnsuspend        = "guild.unsuspend"
	ActionGuildTerminate        = "guild.terminate"
	ActionGuildVanityForceClear = "guild.vanity_force_clear"

	ActionMemberKick       = "member.kick"
	ActionMemberRoleAdd    = "member.role_add"
	ActionMemberRoleRemove = "member.role_remove"

	ActionChannelCreate           = "channel.create"
	ActionChannelUpdate           = "channel.update"
	ActionChannelDelete           = "channel.delete"
	ActionChannelPermissionUpdate = "channel.permission_update"

	ActionCategoryCreate = "category.create"
	ActionCategoryUpdate = "category.update"
	ActionCategoryDelete = "category.delete"

	ActionThreadCreate    = "thread.create"
	ActionThreadArchive   = "thread.archive"
	ActionThreadUnarchive = "thread.unarchive"
	ActionThreadDelete    = "thread.delete"

	ActionRoleCreate = "role.create"
	ActionRoleUpdate = "role.update"
	ActionRoleDelete = "role.delete"

	ActionWebhookCreate = "webhook.create"
	ActionWebhookUpdate = "webhook.update"
	ActionWebhookDelete = "webhook.delete"

	ActionMessageDelete = "message.delete"
	ActionMessagePurge  = "message.purge"

	ActionReportResolve = "report.resolve"
)