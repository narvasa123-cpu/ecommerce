import type { Metadata } from 'next';
import { SimpleForm } from '@/components/forms';
export const metadata: Metadata = { title: 'A note to the atelier' };
export default function Contact() {
  return (
    <div className="page-container">
      <div className="service-page">
        <div className="page-heading">
          <p className="eyebrow">CLIENT CARE</p>
          <h1>A note to the atelier.</h1>
          <p>
            A question about a piece, its care, or the journey ahead. We’re here to help you find a
            considered answer.
          </p>
        </div>
        <SimpleForm
          endpoint="contact"
          success="Your note has been received by our development inbox."
        >
          <div className="fields-row">
            <label className="field">
              Your name
              <input name="name" autoComplete="name" required minLength={2} maxLength={100} />
            </label>
            <label className="field">
              Email address
              <input name="email" type="email" autoComplete="email" required maxLength={254} />
            </label>
          </div>
          <label className="field">
            Your note
            <textarea
              name="message"
              placeholder="If this is about an order, include its order number."
              required
              minLength={10}
              maxLength={4000}
            />
          </label>
        </SimpleForm>
        <p className="sample-note align-left">
          Development inbox: your note is saved for the administrator. No external email is sent.
        </p>
      </div>
    </div>
  );
}
