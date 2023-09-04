export async function handleOutput(
  this: Worker,
  event: MessageEvent<unknown>,
): Promise<void> {
  switch (typeof event.data) {
  }
  await 1;
}
