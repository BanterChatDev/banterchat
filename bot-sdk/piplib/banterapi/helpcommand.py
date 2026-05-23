import inspect


def _format_signature(cmd, prefix):
    parts = [f"{prefix}{cmd.name}"]
    for p in cmd.params:
        token = p.name
        if p.kind == inspect.Parameter.VAR_POSITIONAL:
            token = f"...{p.name}"
        elif p.kind == inspect.Parameter.KEYWORD_ONLY:
            token = p.name
        required = p.default is inspect.Parameter.empty and p.kind != inspect.Parameter.VAR_POSITIONAL
        parts.append(f"<{token}>" if required else f"[{token}]")
    return " ".join(parts)


def _prefix_lines(cmds, prefix):
    lines = []
    for cmd in sorted(cmds, key=lambda c: c.name):
        sig = _format_signature(cmd, prefix)
        doc = (cmd.help or "").strip().split("\n", 1)[0]
        line = f"`{sig}`"
        if doc:
            line += f" — {doc}"
        lines.append(line)
    return "\n".join(lines)


def _group_by_category(cmds):
    groups = {}
    for cmd in cmds:
        label = cmd.category or "Other"
        groups.setdefault(label, []).append(cmd)
    ordered = [k for k in groups if k != "Other"]
    ordered.sort()
    if "Other" in groups:
        ordered.append("Other")
    return [(label, groups[label]) for label in ordered]


def register(bot):
    from .embed import Embed

    @bot.command(name="help", help="Lists all commands.", category="Info")
    async def _help(ctx):
        prefix_cmds = [c for c in bot.commands if c.name != "help"]
        slash_cmds = list(bot._slash_commands)
        if not prefix_cmds and not slash_cmds:
            await ctx.reply("No commands registered.")
            return

        e = Embed(title=f"{bot.user.username if bot.user else 'Bot'} commands", color=0x5865f2)
        for label, cmds in _group_by_category(prefix_cmds):
            body = _prefix_lines(cmds, bot.command_prefix)
            if body:
                e.add_field(label, body, inline=False)

        if slash_cmds:
            slash_groups = {}
            for entry in slash_cmds:
                key = entry.get("_category") or "Slash Commands"
                slash_groups.setdefault(key, []).append(entry)
            for label in sorted(slash_groups):
                lines = []
                for entry in sorted(slash_groups[label], key=lambda x: x["name"]):
                    desc = (entry.get("description") or "").strip()
                    line = f"`/{entry['name']}`"
                    if desc and desc != entry["name"]:
                        line += f" — {desc}"
                    lines.append(line)
                prefix_label = label if label != "Slash Commands" else "Slash Commands"
                e.add_field(prefix_label, "\n".join(lines), inline=False)

        e.set_footer(f"Prefix: {bot.command_prefix} · use {bot.command_prefix}help anytime")
        await ctx.reply(embed=e)