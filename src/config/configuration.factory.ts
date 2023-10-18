export default () => ({
  db: {
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || 'example',
    host: process.env.DATABASE_HOST || 'mongo',
    port: process.env.DATABASE_PORT || '27017',
    database: process.env.DATABASE_NAME || 'testdb',
    authSource: process.env.DATABASE_AUTH_SOURCE || 'admin',
  },
  jwt: {
    secretOrKey: 'secret',
    expiresIn: 36000000,
  },
  host: {
    //Your server URL. This is used to create links in the emails sent (eg: for email confirmation)
    url: 'http://localhost',
    port: '3000',
  },
  mail: {
    host: '',
    port: '',
    // Setting secure to false does not mean that you would use an unencrypted connection. Most SMTP servers
    // allow connection upgrade via STARTTLS command, but to use this you have to connect using plaintext first
    secure: false,
    // if requireTLS is true and secure is false then Nodemailer will required a connection upgrade via STARTTLS.
    // If the connection can not be encrypted the message is not sent.
    requireTLS: true,
    tls: {
      ciphers: 'SSLv3',
      // Node.js TLSSocket options to be passed to the socket constructor. For a list of options, see:
      // https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions
    },
    user: '',
    pass: '',
    fromName: '',
    fromEmail: '',
  },
});
