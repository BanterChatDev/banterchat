# banterbotapi

Python SDK for building bots on [Banter](https://banterchat.org).

```bash
pip install banterbotapi
```

Install name is `banterbotapi`, import name is `banterapi` (same pattern as Pillow/PIL).

## Quick start

```python
from banterapi import Bot, Intents

bot = Bot(intents=Intents.default() | Intents.MESSAGE_CONTENT)

@bot.event
async def on_ready():
    print(f"logged in as {bot.user.username}")

@bot.event
async def on_message(message):
    if message.content == "!ping":
        await message.reply("pong")

bot.run("YOUR_TOKEN")
```

## Slash commands

```python
from banterapi import SlashOption, Optional, OPTION_STRING, OPTION_INTEGER

@bot.slash_command(
    name="roll",
    description="Roll an N-sided die",
    options=[Optional("sides", type=OPTION_INTEGER, description="default 6")],
)
async def roll(interaction):
    sides = interaction.options.get("sides", 6)
    await interaction.respond(f"🎲 {sides}-sided die")
```

`Optional(name, ...)` is a shorthand for `SlashOption(name, ..., required=False)`.

Response methods on `interaction`:

| Method | Use for |
|---|---|
| `respond(content, embed=, ephemeral=, components=)` | The visible reply. Once per interaction. |
| `defer(ephemeral=)` | Ack now, reply within 15 minutes. Shows a thinking indicator. |
| `followup(content, embed=, ...)` | Additional messages after `respond`. Repeatable. |
| `update(content, embed=, components=)` | Button only. Edits the source message in place. |

`ephemeral=True` makes the message visible only to the invoker.

## Buttons

Attach buttons to any embed and handle clicks with `@bot.on_button`.

```python
from banterapi import Embed

@bot.slash_command(name="confirm", description="Confirm or cancel")
async def confirm(interaction):
    embed = Embed(title="Are you sure?")
    embed.add_button("Yes", style="success", custom_id="confirm_yes")
    embed.add_button("No",  style="danger",  custom_id="confirm_no")
    await interaction.respond(embed=embed, ephemeral=True)

@bot.on_button("confirm_yes")
async def yes(interaction):
    await interaction.update(content="Confirmed.", components=[])

@bot.on_button("confirm_no")
async def no(interaction):
    await interaction.update(content="Cancelled.", components=[])
```

Glob match a family of buttons with a trailing `*` — useful for pagination where the page number rides in the id:

```python
@bot.on_button("page_*")
async def page(interaction):
    n = int(interaction.custom_id.removeprefix("page_"))
    await interaction.update(embed=build_page(n))
```

`add_button(label, style=, custom_id=, url=, emoji=, disabled=)` — styles are `primary`, `secondary`, `success`, `danger`, `link`. `link` requires `url`; everything else needs `custom_id` to fire a handler. Up to 5 buttons per row, up to 5 rows per message.

Buttons work everywhere a message goes: `bot.send_message(...)`, `message.reply(...)`, `interaction.respond(...)`, `interaction.followup(...)`, `interaction.update(...)`.

## Embeds

```python
embed = Embed(title="Status", description="All systems nominal.", color=0x57F287)
embed.add_field("Uptime", "12d 4h", inline=True)
embed.add_field("Users",  "1,204",   inline=True)
embed.set_footer("Last checked just now")
embed.set_thumbnail("https://example.com/icon.png")
await message.channel.send(embed=embed)
```

Color accepts an `int` (`0x5865F2`) or a CSS hex string (`"#5865f2"`).

## Events

```python
@bot.event
async def on_ready(): ...

@bot.event
async def on_message(message): ...

@bot.event
async def on_message_edit(before, after): ...

@bot.event
async def on_member_join(member): ...

@bot.event
async def on_reaction_add(reaction, user): ...
```

The full event list lives in `client.py`. Names follow discord.py conventions where they overlap.

## Permissions

```python
from banterapi import Permissions, has_permissions

@bot.slash_command(name="ban", description="Ban a user")
@has_permissions(Permissions.BAN_MEMBERS)
async def ban(interaction): ...
```

`Permissions` is a flag enum. Combine with `|`, check with `&`. Decorators raise `MissingPermissions` which the bot can catch in an `on_error` handler.

## Intents

```python
intents = Intents.default() | Intents.MESSAGE_CONTENT
bot = Bot(intents=intents)
```

`Intents.default()` covers the common cases (guilds, members, messages without content, reactions). Add `MESSAGE_CONTENT` to receive message text in `on_message`.

## Sending files

```python
from banterapi import File

await message.channel.send(content="Here's the report.", file=File("report.pdf"))
await message.channel.send(files=[File("a.png"), File("b.png")])
```

## Error handling

```python
from banterapi import Forbidden, NotFound, RateLimited

try:
    await message.channel.send("hi")
except Forbidden:
    pass  # bot lacks permission
except RateLimited as e:
    await asyncio.sleep(e.retry_after)
```

Base class is `BanterError`; HTTP-specific errors inherit from `HTTPException`.
pip install banterbotapi
```

```python
from banterapi import Bot, Intents

bot = Bot(intents=Intents.default() | Intents.MESSAGE_CONTENT)
bot.run("YOUR_TOKEN")
```

Install name is `banterbotapi`, import name is `banterapi` (same pattern as Pillow/PIL).
