import type { ConferenceResult } from "@/lib/conference-logic";

type PendingConference = {
  imageUri: string;
  imageBase64: string;
  imageWidth: number;
  imageHeight: number;
};

type ConferenceSession = {
  pending: PendingConference | null;
  result: ConferenceResult | null;
};

let session: ConferenceSession = {
  pending: null,
  result: null,
};

export function setPendingConference(pending: PendingConference) {
  session = { pending, result: null };
}

export function getPendingConference() {
  return session.pending;
}

export function setConferenceResult(result: ConferenceResult) {
  session = { ...session, result };
}

export function getConferenceResult() {
  return session.result;
}

export function clearConferenceSession() {
  session = { pending: null, result: null };
}
