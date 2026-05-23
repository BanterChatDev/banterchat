package reply

type Data struct {
	ID              string `json:"id"`
	UserID          string `json:"user_id"`
	Username        string `json:"username"`
	DisplayName     string `json:"display_name,omitempty"`
	AvatarID        string `json:"avatar_id,omitempty"`
	RoleColor       string `json:"role_color,omitempty"`
	Content         string `json:"content"`
	AuthorPerms     int64  `json:"author_perms"`
	AttachmentCount int    `json:"attachment_count,omitempty"`
}