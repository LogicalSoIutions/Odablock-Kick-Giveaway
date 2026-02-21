export async function register() {
  // Only run on the Node.js server runtime (not edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getAppAccessToken, getChannel, subscribeToEvent } = await import(
      "@/lib/kick"
    );

    const targetChannel = process.env.KICK_TARGET_CHANNEL;
    if (!targetChannel) {
      console.warn(
        "KICK_TARGET_CHANNEL not set — skipping webhook subscription"
      );
      return;
    }

    try {
      const appToken = await getAppAccessToken();
      const channel = await getChannel(appToken, targetChannel);
      await subscribeToEvent(appToken, channel.broadcaster_user_id);
      console.log(
        `[startup] Subscribed to chat.message.sent for channel: ${targetChannel} (broadcaster_user_id: ${channel.broadcaster_user_id})`
      );
    } catch (err) {
      console.error("[startup] Failed to subscribe to webhook event:", err);
    }
  }
}
