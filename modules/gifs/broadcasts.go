package gifs

import (
	"ror/modules/db"
	"time"
)

func (s *Service) emitTabCreate(userID string, tab db.GifTabRow) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "gif_tab_create", map[string]interface{}{
		"id":         tab.ID,
		"name":       tab.Name,
		"position":   tab.Position,
		"created_at": tab.CreatedAt.UTC().Format(time.RFC3339),
	})
}

func (s *Service) emitTabRename(userID, tabID, name string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "gif_tab_rename", map[string]string{
		"id":   tabID,
		"name": name,
	})
}

func (s *Service) emitTabDelete(userID, tabID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "gif_tab_delete", map[string]string{
		"id": tabID,
	})
}

func (s *Service) emitFavoriteAdd(userID, favID, tabID, tenorID, url string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "gif_favorite_add", map[string]string{
		"id":       favID,
		"tab_id":   tabID,
		"tenor_id": tenorID,
		"url":      url,
	})
}

func (s *Service) emitFavoriteDelete(userID, favID, tenorID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "gif_favorite_delete", map[string]string{
		"id":       favID,
		"tenor_id": tenorID,
	})
}

func (s *Service) emitFavoriteMove(userID, favID, tabID string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "gif_favorite_move", map[string]string{
		"id":     favID,
		"tab_id": tabID,
	})
}