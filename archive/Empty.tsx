import React from "react";

export default function Empty({ message = "Nothing to show" }: { message?: string }) {
  return (
    <div className="empty">{message}</div>
  );
}
