package bots

import (
	"encoding/json"

	"github.com/labstack/echo/v4"

	"ror/modules/messages"
)

func (a *API) SendMessage(c echo.Context) error {
	userID := c.Get("userID").(string)
	channelID := c.Param("id")
	var body struct {
		Content       string          `json:"content"`
		AttachmentID  string          `json:"attachment_id"`
		AttachmentIDs []string        `json:"attachment_ids"`
		ReplyTo       string          `json:"reply_to"`
		Embed         json.RawMessage `json:"embed"`
		Components    json.RawMessage `json:"components"`
	}
	if err := c.Bind(&body); err != nil {
		return badReq(c)
	}
	msg, err := a.messages.Send(userID, messages.SendReq{
		ChannelID:     channelID,
		Content:       body.Content,
		AttachmentID:  body.AttachmentID,
		AttachmentIDs: body.AttachmentIDs,
		ReplyTo:       body.ReplyTo,
		Embed:         body.Embed,
		Components:    body.Components,
		IsBot:         true,
	})
	if err != nil {
		return mapActionError(c, err)
	}
	return c.JSON(201, msg)
}

func (a *API) EditMessage(c echo.Context) error {
	userID := c.Get("userID").(string)
	messageID := c.Param("id")
	var body struct {
		Content string `json:"content"`
	}
	if err := c.Bind(&body); err != nil {
		return badReq(c)
	}
	if err := a.messages.Edit(userID, messageID, body.Content); err != nil {
		return mapActionError(c, err)
	}
	return c.NoContent(204)
}

func (a *API) DeleteMessage(c echo.Context) error {
	userID := c.Get("userID").(string)
	messageID := c.Param("id")
	if err := a.messages.DeleteMessageByID(messageID, userID, false); err != nil {
		return mapActionError(c, err)
	}
	return c.NoContent(204)
}

func (a *API) AddReaction(c echo.Context) error {
	userID := c.Get("userID").(string)
	channelID := c.Param("chid")
	messageID := c.Param("mid")
	emoji := c.Param("emoji")
	if err := a.reacts.AddReaction(userID, channelID, messageID, emoji); err != nil {
		return mapActionError(c, err)
	}
	return c.NoContent(204)
}

func (a *API) RemoveReaction(c echo.Context) error {
	userID := c.Get("userID").(string)
	channelID := c.Param("chid")
	messageID := c.Param("mid")
	emoji := c.Param("emoji")
	if err := a.reacts.RemoveReaction(userID, channelID, messageID, emoji); err != nil {
		return mapActionError(c, err)
	}
	return c.NoContent(204)
}

func (a *API) Typing(c echo.Context) error {
	userID := c.Get("userID").(string)
	channelID := c.Param("id")
	a.typings.Start(userID, channelID)
	return c.NoContent(204)
}