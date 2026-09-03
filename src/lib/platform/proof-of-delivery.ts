export type ProofOfDeliveryRecord = {
  jobId: string;
  companySlug: string;
  recipientName: string;
  photoDataUrl: string | null;
  signatureDataUrl: string | null;
  completedAt: string | null;
  baseStopCompletedAt: string | null;
  returnedToBaseAt: string | null;
};

export type ProofRequirements = {
  proofOfDeliveryEnabled: boolean;
  photoProofEnabled: boolean;
  signatureConfirmationEnabled: boolean;
};

const PROOF_KEY_PREFIX = "dispatch.proof-of-delivery.";
const PROOF_UPDATED_EVENT = "dispatch:proof-of-delivery-updated";

const storageKey = (companySlug: string, jobId: string) =>
  `${PROOF_KEY_PREFIX}${companySlug}.${jobId}`;

export const emptyProofOfDelivery = (
  companySlug: string,
  jobId: string
): ProofOfDeliveryRecord => ({
  jobId,
  companySlug,
  recipientName: "",
  photoDataUrl: null,
  signatureDataUrl: null,
  completedAt: null,
  baseStopCompletedAt: null,
  returnedToBaseAt: null,
});

export const readProofOfDelivery = (
  companySlug: string,
  jobId: string
): ProofOfDeliveryRecord => {
  if (typeof window === "undefined") {
    return emptyProofOfDelivery(companySlug, jobId);
  }

  const raw = window.localStorage.getItem(storageKey(companySlug, jobId));
  if (!raw) return emptyProofOfDelivery(companySlug, jobId);

  try {
    const value = JSON.parse(raw) as Partial<ProofOfDeliveryRecord>;
    return {
      ...emptyProofOfDelivery(companySlug, jobId),
      ...value,
      jobId,
      companySlug,
      recipientName: typeof value.recipientName === "string" ? value.recipientName : "",
      photoDataUrl: typeof value.photoDataUrl === "string" ? value.photoDataUrl : null,
      signatureDataUrl:
        typeof value.signatureDataUrl === "string" ? value.signatureDataUrl : null,
      completedAt: typeof value.completedAt === "string" ? value.completedAt : null,
      baseStopCompletedAt:
        typeof value.baseStopCompletedAt === "string" ? value.baseStopCompletedAt : null,
      returnedToBaseAt:
        typeof value.returnedToBaseAt === "string" ? value.returnedToBaseAt : null,
    };
  } catch {
    return emptyProofOfDelivery(companySlug, jobId);
  }
};

export const writeProofOfDelivery = (
  record: ProofOfDeliveryRecord
): ProofOfDeliveryRecord => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      storageKey(record.companySlug, record.jobId),
      JSON.stringify(record)
    );
    window.dispatchEvent(
      new CustomEvent(PROOF_UPDATED_EVENT, {
        detail: { companySlug: record.companySlug, jobId: record.jobId },
      })
    );
  }
  return record;
};

export const updateProofOfDelivery = (
  companySlug: string,
  jobId: string,
  patch: Partial<ProofOfDeliveryRecord>
) => {
  const current = readProofOfDelivery(companySlug, jobId);
  return writeProofOfDelivery({
    ...current,
    ...patch,
    companySlug,
    jobId,
  });
};

export const getMissingProofRequirements = (
  record: ProofOfDeliveryRecord,
  requirements: ProofRequirements
): string[] => {
  if (!requirements.proofOfDeliveryEnabled) return [];

  const missing: string[] = [];
  if (requirements.photoProofEnabled && !record.photoDataUrl) {
    missing.push("photo proof");
  }
  if (requirements.signatureConfirmationEnabled && !record.signatureDataUrl) {
    missing.push("recipient signature");
  }
  return missing;
};

export const isProofOfDeliveryComplete = (
  record: ProofOfDeliveryRecord,
  requirements: ProofRequirements
) => getMissingProofRequirements(record, requirements).length === 0;

export const markProofComplete = (
  companySlug: string,
  jobId: string
) => updateProofOfDelivery(companySlug, jobId, { completedAt: new Date().toISOString() });

export const markBaseStopComplete = (
  companySlug: string,
  jobId: string
) => updateProofOfDelivery(companySlug, jobId, { baseStopCompletedAt: new Date().toISOString() });

export const markReturnedToBase = (
  companySlug: string,
  jobId: string
) => updateProofOfDelivery(companySlug, jobId, { returnedToBaseAt: new Date().toISOString() });

export const PROOF_OF_DELIVERY_UPDATED_EVENT = PROOF_UPDATED_EVENT;
