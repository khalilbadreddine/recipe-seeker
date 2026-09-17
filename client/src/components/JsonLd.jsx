import React from 'react'

/** Injects a JSON-LD block into the page body (crawlers read body JSON-LD fine). */
export default function JsonLd({ data }) {
  const payload = Array.isArray(data) ? data : [data]
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload.length === 1 ? payload[0] : payload) }}
    />
  )
}
