import React, { useEffect } from 'react';
import Navbar from '../landing/Navbar';
import Footer from '../landing/Footer';

export const LEGAL_DOCS = {
  tos: {
    title: 'Terms of Service',
    lastUpdated: 'May 14, 2026',
    body: [
      ['h2', '1. Acceptance of Terms'],
      ['p', 'By downloading, accessing, or using Banter, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use Banter.'],

      ['h2', '2. Use of Service'],
      ['p', 'Banter is a private communication platform. You agree to use Banter only for lawful purposes. You are responsible for all activity that occurs under your account. You must be at least 13 years of age (or the minimum age required in your country) to use our services.'],

      ['h2', '3. Acceptable Use Policy'],
      ['p', 'You agree **not** to use Banter to:'],
      ['ul', [
        '**Engage in illegal activity:** Including but not limited to the distribution of Child Sexual Abuse Material (CSAM), gore, or other prohibited content.',
        '**Harass or bully:** Engage in stalking, threats, or harassment of other users.',
        '**Infringe rights:** Violate the intellectual property, privacy, or publicity rights of others.',
        '**Harm the platform:** Attempt to gain unauthorized access to our systems, distribute malware, or engage in automated bulk messaging (spam).',
      ]],

      ['h2', '4. Privacy and Encryption'],
      ['p', 'Banter encrypts your messages at rest on our servers, and voice and video calls use end-to-end encryption between participants. We do not access or read your private messages except where you explicitly forward them to us through the in-app report system. Our [Privacy Policy](/privacy) describes in detail what we store, what we deliberately do not store, and how legal requests are handled.'],

      ['h2', '5. Reporting and Moderation'],
      ['p', 'While we cannot proactively monitor your messages, we take community safety seriously.'],
      ['ul', [
        '**Reporting:** If you encounter illegal or harmful content, you may report it using the in-app reporting feature.',
        '**Consent for Review:** By submitting a report, you agree to forward the specific reported content to our Trust & Safety team. You explicitly consent to our moderation team viewing this specific content to investigate violations.',
        '**Enforcement:** Banter reserves the right to terminate accounts, block devices, or report illegal activity to law enforcement if we determine a violation of these Terms has occurred.',
      ]],

      ['h2', '6. Intellectual Property'],
      ['p', 'Banter and its logos, designs, and software are the exclusive property of Volcan .pvt Lmt. You are granted a limited, non-exclusive license to use the app for personal, non-commercial communication.'],

      ['h2', '7. Disclaimers and Limitation of Liability'],
      ['ul', [
        '**"As Is":** Banter is provided on an "as is" and "as available" basis. We make no warranties that the service will be uninterrupted, error-free, or secure.',
        '**Liability Limitation:** To the maximum extent permitted by law, Banter shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of the service. We are not responsible for the actions or conduct of other users.',
      ]],

      ['h2', '8. Termination'],
      ['p', 'We reserve the right to suspend or terminate your access to Banter at any time, with or without notice, if we believe you have breached these terms or engaged in conduct that poses a risk to our platform or community.'],

      ['h2', '9. Changes to Terms'],
      ['p', 'We may update these terms periodically. Your continued use of Banter after any updates constitutes your acceptance of the new Terms of Service.'],

      ['h2', '10. Contact'],
      ['ul', [
        '**Website:** [banterchat.org](https://banterchat.org)',
        '**Support guild:** [banterchat.org/invite/banterr](https://banterchat.org/invite/banterr)',
      ]],
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'May 14, 2026',
    body: [
      ['h2', '1. Introduction'],
      ['p', 'Banter is a global communication platform built on a "Privacy by Design" philosophy. We believe that secure, private communication is a fundamental right. This policy outlines how we protect your data while maintaining the safety of our global community.'],

      ['h2', '2. How Encryption Works on Banter'],
      ['p', 'Different kinds of data get different protection:'],
      ['ul', [
        '**Messages, channels, and DMs — encrypted at rest.** Your messages are stored encrypted on our servers. Disk access alone reveals nothing. Staff do not read messages during normal operation; the only exceptions are content you forward to us via the in-app report system, or a valid legal compulsion (Section 5).',
        '**Voice and video — end-to-end encrypted.** Camera and microphone streams are encrypted between participants. Our infrastructure routes the encrypted media but cannot decrypt it. We never see or hear your calls.',
        '**Lookups — hashed, not stored.** When we only need to check whether something exists (an IP on a ban list, a keyfile presented at login) we store a one-way hash and compare hashes against hashes. The plaintext is never kept.',
        '**Deletion is real.** When you delete a message, a channel, or an attached file, the database row is removed and the file is deleted from disk. There is no "soft delete" flag, no archival copy, no hidden retention. Once you delete it, it is gone.',
      ]],

      ['h2', '3. What We Collect'],
      ['p', 'We collect the minimum needed for the service to work. **We do not sell user data, share it with advertisers, or use it to build profiles.** There is no ad network here and no analytics broker. The list below is essentially everything we hold:'],
      ['ul', [
        '**Account:** Your username and anything you add to your profile (display name, bio, avatar). Your password is stored as a salted hash — we cannot read it or recover it.',
        '**Keyfile (optional):** We never collect your email address — we have no email server, no mailing list, no provider. Instead, recovery and new-device verification use a *keyfile*: 32 bytes of random data we generate the moment you opt in, that you download and keep yourself. We never see the keyfile itself — only a SHA-256 hash of it, used to verify the file you upload on new-device login or password reset. If you lose the keyfile and forget your password, your account is unrecoverable. There is no recovery email, no support reset, no backup. That is the trade for collecting nothing.',
        '**Messages:** Encrypted at rest as described in Section 2. We hold the encrypted blob and the routing metadata needed to deliver it (sender, channel or recipient, timestamp).',
        '**Hashed IPs:** One-way hashes of session and ban IPs. We never store plaintext IPs. The hash lets us answer "is this IP banned?" without retaining the IP itself.',
        '**Infrastructure note:** Banter runs on third-party VPS hosting for compute and bandwidth. The provider sees encrypted traffic and disk blocks. No third party decrypts or processes message content; encryption and decryption are both gated by Banter.',
      ]],

      ['h2', '4. Moderation & Reports'],
      ['p', 'Banter has zero tolerance for illegal conduct — CSAM, gore, harassment, or coordinated abuse.'],
      ['ul', [
        '**No automated scanning.** We do not scan your messages — neither client-side hash matching nor server-side AI or keyword filters. Enforcement is driven entirely by user reports.',
        '**Reports:** When a user submits a report, the reported message and its immediate context are forwarded to our moderation team. The reporter knows this happens; it is how the report flow works.',
        '**Staff access to messages:** Outside of legal compulsion (Section 5), reviewing reported content is the only purpose for which our moderators access message data.',
        { text: '**Enforcement:** If a report is confirmed, we may:', sub: ['ul', [
          "Permanently terminate the offender's account.",
          "Block future sign-ins from the offender by matching incoming connections against our hashed IP records (we never store the plaintext IP).",
          'Report the activity to law enforcement, where required by law (this applies to CSAM).',
        ]] },
      ]],

      ['h2', '5. Legal Requests'],
      ['p', 'We comply with valid, legally binding requests. Because of how little we keep, the substantive answer to most requests is that there is very little to hand over:'],
      ['ul', [
        '**Messages:** We can decrypt messages we hold under valid legal compulsion. We do not retain decrypted plaintext beyond what is needed to answer the request.',
        '**IPs:** Stored only as one-way hashes — there is no plaintext IP for us to disclose. We can confirm whether a specific IP supplied by a requester matches a hashed record on our system, but we cannot produce a list.',
        '**Contact details:** We do not collect email addresses, phone numbers, real names, addresses, or payment details. There is nothing in those categories to disclose.',
        '**Other metadata:** Account creation date, username, and server/channel memberships are what remains. We do not collect advertising identifiers or device fingerprints.',
        '**Process:** Every request is reviewed by our legal team for jurisdictional validity and scope before any disclosure.',
      ]],

      ['h2', '6. Where Your Data Lives'],
      ['p', 'Banter is hosted on servers physically located in the United States. We do not replicate user data to other jurisdictions. If you are using Banter from outside the US, your account data is processed in the US under US law; we still honor the data-protection rights described in Section 7 regardless of where you are.'],

      ['h2', '7. Your Rights'],
      ['p', 'You can exercise these at any time, from anywhere:'],
      ['ul', [
        '**Access:** Request a summary of what we hold about your account.',
        '**Erasure (per-item):** Delete any individual message, channel, or attached file from inside the app. Deletion is immediate and final — the database row is removed and any associated file is deleted from disk. There is no soft-delete flag or archival copy. Once you delete it, it is gone.',
        '**Erasure (account):** Delete your entire account in app settings. This removes your associated data from our systems.',
        '**Rectification:** Update your profile information in app settings.',
      ]],

      ['h2', "8. Children's Privacy"],
      ['p', 'Banter is for users who are at least 13 years of age. We do not knowingly collect information from children. If we discover a user is underage, we will immediately terminate the account and delete all associated data.'],

      ['h2', '9. Updates to This Policy'],
      ['p', 'We may update this policy to reflect changes in technology or law. Significant changes will be communicated via the app. Continued use of Banter after updates constitutes acceptance of the new policy.'],

      ['h2', '10. Contact Us'],
      ['ul', [
        '**Support guild:** [banterchat.org/invite/banterr](https://banterchat.org/invite/banterr)',
      ]],
    ],
  },

  guidelines: {
    title: 'Community Guidelines',
    lastUpdated: 'April 21, 2026',
    body: [
      ['h2', 'Welcome to Banter'],
      ['p', 'Banter is designed to be a safe, private space for authentic connection. Because we cannot see your messages, the quality of our community depends on you. By using Banter, you agree to help us maintain a respectful and safe environment.'],

      ['h2', '1. Our Core Values'],
      ['ul', [
        '**Respect:** Treat others as you would like to be treated. Differences of opinion are natural, but they must be expressed with civility.',
        '**Safety:** We prioritize the well-being of all users. Our platform is not a place for harm, intimidation, or illegal activities.',
        '**Integrity:** Be honest. Impersonation, deception, and spamming undermine the trust that makes Banter work.',
      ]],

      ['h2', '2. What is Prohibited'],
      ['p', 'To ensure Banter remains safe for everyone, the following behaviors are strictly forbidden:'],
      ['ul', [
        '**Illegal Material:** The sharing of Child Sexual Abuse Material (CSAM), gore, or any other illegal content is strictly prohibited and will result in immediate permanent account termination and referral to law enforcement.',
        '**Harassment & Bullying:** Targeted attacks, stalking, spreading rumors, or behavior meant to intimidate or emotionally distress others are not tolerated.',
        '**Hate Speech:** We do not allow content that promotes violence or incites hatred against individuals or groups based on attributes like race, religion, disability, age, nationality, or sexual orientation.',
        '**Deceptive Practices:** Do not impersonate others, spread malicious misinformation, or use Banter to execute scams or phishing attacks.',
      ]],

      ['h2', '3. How to Protect Your Community'],
      ['p', 'You are the first line of defense in keeping Banter safe:'],
      ['ul', [
        "**Report, Don't Ignore:** If you encounter behavior that violates these guidelines, please use the Report feature in the app. This allows our Trust & Safety team to review the incident and take appropriate action.",
        "**Respect Privacy:** Do not share screenshots of private conversations or someone else's personal information without their explicit consent.",
        '**Use Blocking:** If you are uncomfortable with someone, use the "Block" feature. You are not obligated to engage with anyone who makes you feel unsafe.',
      ]],

      ['h2', '4. Understanding Our Moderation'],
      ['p', 'We believe in privacy, but privacy is not a shield for illegal acts.'],
      ['ul', [
        '**Human-Led Moderation:** When you report content, it is reviewed by a real human moderator. We act swiftly to remove prohibited content and remove the accounts of those who threaten the safety of our community.',
        '**Fairness:** We strive to apply these guidelines consistently. Our decisions are based on the evidence provided in user reports and our [Terms of Service](/tos).',
      ]],

      ['h2', '5. Staying Safe'],
      ['ul', [
        "**Trust Your Instincts:** Be cautious about sharing personal information with people you don't know well.",
        '**Keep Software Updated:** Always use the latest version of Banter to ensure you have the latest security features.',
      ]],
    ],
  },

  contentPolicy: {
    title: 'Prohibited Content Policy',
    lastUpdated: 'May 14, 2026',
    body: [
      ['h2', '1. Zero Tolerance'],
      ['p', 'Banter maintains a zero-tolerance policy regarding the creation, distribution, storage, or promotion of illegal content, specifically:'],
      ['ul', [
        '**Child Sexual Abuse Material (CSAM):** Any visual depiction or imagery involving a minor engaged in sexually explicit conduct.',
        '**Violent & Graphic Material:** Material depicting severe gore, torture, or other heinous acts of violence.',
        '**Exploitation:** Any content involving the sexual exploitation or abuse of children, including grooming or sextortion.',
      ]],

      ['h2', '2. Our Stance on Encryption and Safety'],
      ['p', 'Banter uses encryption at rest for messages and end-to-end encryption for voice and video. **Encryption is not a shield for illegal activity.** We have designed Banter so that illegal acts can be identified, reported, and acted on through the user-reporting system without compromising the privacy of law-abiding users.'],

      ['h2', '3. Reporting and Enforcement'],
      ['p', 'We do not perform automated content scanning on private messages — neither client-side hashing of media (such as the systems some platforms use to detect known CSAM hashes on-device before sending) nor server-side keyword or AI-based scanning of message text. Our enforcement model relies on the in-app reporting system instead:'],
      ['ul', [
        '**User Reports:** If you witness any activity violating this policy, you must report it immediately using the in-app "Report" tool.',
        '**Evidence Submission:** When you report content, you are enabling our Trust & Safety team to review the specific material. By reporting, you grant us consent to access the shared media for the sole purpose of investigation.',
        { text: '**Immediate Action:** Upon confirming a violation involving illegal material, we will:', sub: ['ol', [
          "**Permanently Terminate** the offender's account and block their access to Banter.",
          '**Report the illegal content and user metadata** to the appropriate law enforcement authorities (e.g., NCMEC in the U.S., or local equivalents).',
          '**Preserve data** as required by law for investigative purposes.',
        ]] },
      ]],

      ['h2', '4. Mandatory Reporting to Authorities'],
      ['p', 'Banter fully complies with all legal obligations to report illegal conduct. We cooperate with law enforcement globally to assist in the investigation and prosecution of individuals who distribute CSAM or graphic violent material. If we are notified of such content, we will take all necessary steps to comply with the law, which may include the disclosure of account metadata to authorized government agencies.'],

      ['h2', '5. User Responsibility'],
      ['p', 'By using Banter, you acknowledge that:'],
      ['ul', [
        'You are responsible for the content you send.',
        'Attempting to bypass these protections or using Banter for illegal purposes will result in the loss of your account and potential criminal prosecution.',
      ]],
    ],
  },
};

const INLINE_RE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

function renderInline(text, navigate, keyPrefix) {
  const out = [];
  let last = 0;
  let i = 0;
  let m;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(<strong key={`${keyPrefix}-i${i++}`} className="text-white/95 font-semibold">{m[1]}</strong>);
    } else {
      const href = m[3];
      const isExternal = href.startsWith('http') || href.startsWith('mailto:');
      out.push(
        <a
          key={`${keyPrefix}-i${i++}`}
          href={href}
          {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : { onClick: (e) => { e.preventDefault(); navigate(href); } })}
          className="text-[var(--accent)] hover:underline"
        >
          {m[2]}
        </a>
      );
    }
    last = INLINE_RE.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderListItem(item, navigate, key) {
  if (typeof item === 'string') {
    return <li key={key}>{renderInline(item, navigate, key)}</li>;
  }
  return (
    <li key={key}>
      {renderInline(item.text, navigate, key)}
      {item.sub && renderBlock(item.sub, navigate, `${key}-sub`)}
    </li>
  );
}

function renderBlock(block, navigate, key) {
  const [type, payload] = block;
  if (type === 'h2') return <h2 key={key} className="text-xl font-bold text-white mt-10 mb-3">{payload}</h2>;
  if (type === 'h3') return <h3 key={key} className="text-base font-semibold text-white/95 mt-5 mb-2">{payload}</h3>;
  if (type === 'p') return <p key={key}>{renderInline(payload, navigate, key)}</p>;
  if (type === 'ul') {
    return (
      <ul key={key} className="list-disc pl-6 space-y-2 marker:text-white/30">
        {payload.map((it, i) => renderListItem(it, navigate, `${key}-${i}`))}
      </ul>
    );
  }
  if (type === 'ol') {
    return (
      <ol key={key} className="list-decimal pl-6 space-y-2 marker:text-white/30">
        {payload.map((it, i) => renderListItem(it, navigate, `${key}-${i}`))}
      </ol>
    );
  }
  return null;
}

export default function Legal({ doc, navigate, user }) {
  useEffect(() => {
    document.title = `${doc.title} · Banter`;
  }, [doc.title]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-white relative select-text">
      <Navbar navigate={navigate} user={user} />
      <main className="flex-1 pt-[clamp(5rem,8vw,7rem)] pb-12 px-[clamp(1.5rem,4vw,3rem)]">
        <div className="max-w-3xl mx-auto">
          <header className="mb-10 pb-6 border-b border-white/[0.08]">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{doc.title}</h1>
            <p className="mt-3 text-[12px] uppercase tracking-wider text-white/35">
              Last updated: {doc.lastUpdated}
            </p>
          </header>
          <article className="space-y-5 text-white/75 leading-relaxed text-[14px]">
            {doc.body.map((b, i) => renderBlock(b, navigate, `b-${i}`))}
          </article>
        </div>
      </main>
      <Footer navigate={navigate} />
    </div>
  );
}