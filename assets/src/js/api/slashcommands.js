import { request } from './client';
import { r } from './routes';

export async function apiListGuildCommands(guildId) {
  if (!guildId) return { commands: [] };
  return request('GET', r.guilds.commands(guildId));
}