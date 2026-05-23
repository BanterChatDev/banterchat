class Embed:

    def __init__(self, title="", description="", color=None, url="", image="", thumbnail=""):
        self._data = {}
        if title:
            self._data["title"] = title
        if description:
            self._data["description"] = description
        if color is not None:
            self._data["color"] = color if isinstance(color, str) else f"#{color:06x}"
        if url:
            self._data["url"] = url
        if image:
            self._data["image"] = {"url": image}
        if thumbnail:
            self._data["thumbnail"] = {"url": thumbnail}
        self._data["fields"] = []
        self._pending_buttons = []

    def add_field(self, name, value, inline=False):
        self._data["fields"].append({"name": name, "value": value, "inline": inline})
        return self

    def set_footer(self, text, icon_url=""):
        footer = {"text": text}
        if icon_url:
            footer["icon_url"] = icon_url
        self._data["footer"] = footer
        return self

    def set_author(self, name, url="", icon_url=""):
        author = {"name": name}
        if url:
            author["url"] = url
        if icon_url:
            author["icon_url"] = icon_url
        self._data["author"] = author
        return self

    def set_image(self, url):
        self._data["image"] = {"url": url}
        return self

    def set_thumbnail(self, url):
        self._data["thumbnail"] = {"url": url}
        return self

    def add_button(self, label, style="secondary", url="", emoji="", disabled=False, custom_id="", id=""):
        btn = {"type": "button", "label": label, "style": style or "secondary"}
        if emoji:
            btn["emoji"] = emoji
        if disabled:
            btn["disabled"] = True
        if style == "link":
            if url:
                btn["url"] = url
        else:
            cid = custom_id or id
            if cid:
                btn["custom_id"] = cid
        self._pending_buttons.append(btn)
        return self

    def pending_components(self):
        if not self._pending_buttons:
            return []
        rows = []
        for i in range(0, len(self._pending_buttons), 5):
            rows.append({
                "type": "action_row",
                "components": self._pending_buttons[i:i + 5],
            })
        return rows[:5]

    def to_dict(self):
        d = dict(self._data)
        if not d.get("fields"):
            d.pop("fields", None)
        d.pop("buttons", None)
        return d