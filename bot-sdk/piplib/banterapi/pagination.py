from .embed import Embed
from .logger import Logger


log = Logger(__name__)


class Paginator:
    def __init__(self, *, fetch, per_page, build_embed, prefix="page", empty_message="Nothing to show."):
        self.fetch = fetch
        self.per_page = max(1, int(per_page))
        self.build_embed = build_embed
        self.prefix = prefix
        self.empty_message = empty_message

    def _slice(self, page):
        items = list(self.fetch() or [])
        if not items:
            return [], 0, 1, items
        total = max(1, (len(items) - 1) // self.per_page + 1)
        page = max(0, min(page, total - 1))
        start = page * self.per_page
        chunk = items[start:start + self.per_page]
        return chunk, page, total, items

    def _embed_for(self, page):
        chunk, page, total, items = self._slice(page)
        log.debug("paginator slice prefix=%s requested_page=%s clamped_page=%s total_pages=%s items=%s", self.prefix, page, page, total, len(items))
        if not items:
            return Embed(description=self.empty_message, color=0x2B2D31)
        embed = self.build_embed(chunk, page, total)
        if total > 1:
            embed.add_button("Back", style="secondary", custom_id=f"{self.prefix}_{page - 1}", disabled=(page <= 0))
            embed.add_button("Forward", style="secondary", custom_id=f"{self.prefix}_{page + 1}", disabled=(page + 1 >= total))
        return embed

    async def respond(self, interaction, page=0, ephemeral=False):
        log.info("paginator respond prefix=%s page=%s user=%s", self.prefix, page, interaction.user_id)
        await interaction.respond(embed=self._embed_for(page), ephemeral=ephemeral)

    async def update(self, interaction):
        try:
            page_str = interaction.custom_id.rsplit("_", 1)[1]
            page = int(page_str)
        except (IndexError, ValueError):
            log.info("paginator update could not parse page from custom_id=%r — deferring", interaction.custom_id)
            await interaction.defer()
            return
        log.info("paginator update prefix=%s custom_id=%s parsed_page=%s user=%s msg=%s", self.prefix, interaction.custom_id, page, interaction.user_id, interaction.message_id)
        await interaction.update(embed=self._embed_for(page))
        log.info("paginator update succeeded prefix=%s page=%s", self.prefix, page)

    @staticmethod
    def page_handler(make_paginator):
        async def _handler(interaction):
            pager = make_paginator(interaction)
            await pager.update(interaction)
        return _handler