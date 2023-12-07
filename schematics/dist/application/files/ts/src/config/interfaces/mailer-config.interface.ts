export interface MailerConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  /** Used to sign sent emails, like <Company Name> donotreply@company.com */
  fromName: string;
  fromEmail: string;
  // Setting secure to false does not mean that you would use an unencrypted connection. Most SMTP servers
  // allow connection upgrade via STARTTLS command, but to use this you have to connect using plaintext first
  secure: boolean;
  // if requireTLS is true and secure is false then Nodemailer will required a connection upgrade via STARTTLS.
  // If the connection can not be encrypted the message is not sent.
  requireTLS: boolean;
  tls?: {
    ciphers: string;
    // Node.js TLSSocket options to be passed to the socket constructor. For a list of options, see:
    // https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions
  };
}
