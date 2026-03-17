"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { CLAIM_PRIORITIES } from "@/types/security-claim";

const initialFormState = {
  policyholder: "",
  incidentType: "Bank burglary",
  dateTime: "",
  location: "",
  securityVendor: "",
  policeReportNumber: "",
  lawEnforcementContact: "",
  cctvAvailable: "true",
  propertyType: "Commercial property",
  description: "",
  priority: "High",
  assignedAdjuster: "",
};

export function IntakeForm() {
  const router = useRouter();
  const { authorizedFetch } = useAuth();
  const [formValues, setFormValues] = useState(initialFormState);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(name: keyof typeof initialFormState, value: string) {
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = new FormData();
      for (const [key, value] of Object.entries(formValues)) {
        if (key === "dateTime" && value) {
          payload.append(key, new Date(value).toISOString());
        } else {
          payload.append(key, value);
        }
      }

      for (const file of files) {
        payload.append("evidence", file);
      }

      const response = await authorizedFetch("/api/claims", {
        method: "POST",
        body: payload,
      });

      const claim = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !claim.id) {
        throw new Error(claim.error ?? "The claim could not be submitted.");
      }

      startTransition(() => {
        router.push(`/claims/${claim.id}`);
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "The claim could not be submitted.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="page-stack" onSubmit={handleSubmit}>
      <section className="page-hero">
        <div>
          <p className="page-hero__eyebrow">New Intake</p>
          <h2>Capture a new specialty security claim</h2>
          <p>
            Submit the incident, attach evidence, and launch the SECURITY_CLAIM
            workflow without leaving the browser.
          </p>
        </div>

        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Submitting..." : "Create claim"}
        </button>
      </section>

      <section className="form-grid">
        <article className="panel">
          <div className="panel__header">
            <p className="panel__eyebrow">Incident</p>
            <h3>Core loss details</h3>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Policyholder</span>
              <input
                onChange={(event) => updateField("policyholder", event.target.value)}
                required
                value={formValues.policyholder}
              />
            </label>

            <label className="field">
              <span>Incident type</span>
              <input
                onChange={(event) => updateField("incidentType", event.target.value)}
                required
                value={formValues.incidentType}
              />
            </label>

            <label className="field">
              <span>Date & time</span>
              <input
                onChange={(event) => updateField("dateTime", event.target.value)}
                required
                type="datetime-local"
                value={formValues.dateTime}
              />
            </label>

            <label className="field">
              <span>Location</span>
              <input
                onChange={(event) => updateField("location", event.target.value)}
                required
                value={formValues.location}
              />
            </label>

            <label className="field">
              <span>Property type</span>
              <input
                onChange={(event) => updateField("propertyType", event.target.value)}
                required
                value={formValues.propertyType}
              />
            </label>

            <label className="field">
              <span>Priority</span>
              <select
                onChange={(event) => updateField("priority", event.target.value)}
                value={formValues.priority}
              >
                {CLAIM_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Description</span>
            <textarea
              onChange={(event) => updateField("description", event.target.value)}
              required
              rows={6}
              value={formValues.description}
            />
          </label>
        </article>

        <article className="panel">
          <div className="panel__header">
            <p className="panel__eyebrow">Security response</p>
            <h3>Vendor, police, and evidence context</h3>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Security vendor</span>
              <input
                onChange={(event) => updateField("securityVendor", event.target.value)}
                required
                value={formValues.securityVendor}
              />
            </label>

            <label className="field">
              <span>Police report number</span>
              <input
                onChange={(event) =>
                  updateField("policeReportNumber", event.target.value)
                }
                required
                value={formValues.policeReportNumber}
              />
            </label>

            <label className="field">
              <span>Law enforcement contact</span>
              <input
                onChange={(event) =>
                  updateField("lawEnforcementContact", event.target.value)
                }
                required
                value={formValues.lawEnforcementContact}
              />
            </label>

            <label className="field">
              <span>Assigned adjuster</span>
              <input
                onChange={(event) => updateField("assignedAdjuster", event.target.value)}
                value={formValues.assignedAdjuster}
              />
            </label>

            <label className="field">
              <span>CCTV available</span>
              <select
                onChange={(event) => updateField("cctvAvailable", event.target.value)}
                value={formValues.cctvAvailable}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>Evidence files</span>
            <input
              accept="image/*,video/*,.pdf,.doc,.docx,.txt"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              type="file"
            />
          </label>

          <div className="file-list">
            {files.length === 0 ? (
              <p className="file-list__empty">No files selected yet.</p>
            ) : null}
            {files.map((file) => (
              <div key={`${file.name}-${file.size}`} className="file-pill">
                <span>{file.name}</span>
                <strong>{Math.max(1, Math.round(file.size / 1024))} KB</strong>
              </div>
            ))}
          </div>

          {error ? <p className="panel__error">{error}</p> : null}
        </article>
      </section>
    </form>
  );
}
