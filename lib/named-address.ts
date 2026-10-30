/** Someone as an email names them: their name and address, or their address alone. */
export const named = (name: string | null | undefined, address: string | null) =>
  [name, name && address ? `<${address}>` : address].filter(Boolean).join(" ");
