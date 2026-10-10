import { COMPANY } from "../config/company.js";

export default function FormResult({ result, successText }) {
  if (!result) return null;
  if (result.status === "sent")
    return <div className="notice ok" role="status"><b>Request received.</b>{successText}</div>;
  if (result.status === "not-connected")
    return (
      <div className="notice warn" role="alert">
        <b>This form isn't connected yet — nothing was sent.</b>
        This is a preview. Once a form service is configured, requests will be delivered. For now, please contact {COMPANY.name} at {COMPANY.phone} or {COMPANY.email}.
      </div>
    );
  return <div className="notice warn" role="alert"><b>Something went wrong.</b>{result.message}</div>;
}
