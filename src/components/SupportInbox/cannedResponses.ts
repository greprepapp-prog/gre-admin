export interface CannedResponse {
  label: string
  text: string
}

export const CANNED_RESPONSES: CannedResponse[] = [
  {
    label: 'Bug Fix Update',
    text: "Hi! We've identified the issue you reported and shipped a fix in the latest update. Please update the app and let us know if you still run into problems.",
  },
  {
    label: 'Subscription Restored',
    text: "Thanks for your patience — we've restored your subscription access. You should now have full access to all lessons. Sorry for the inconvenience!",
  },
  {
    label: 'Investigating',
    text: "Thanks for reaching out. We're looking into this and will follow up as soon as we have an update.",
  },
]
