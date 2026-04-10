export async function queueEmailSync(_mailboxId: number): Promise<void> {
  console.log(`Email sync queued for mailbox: ${_mailboxId}`);
}
