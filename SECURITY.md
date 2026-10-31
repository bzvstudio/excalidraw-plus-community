# Security policy

## Supported versions

Security fixes go into the latest release, published as a new patch version of the container
image. Run the newest `X.Y` tag of the minor version you are on, or `latest`; older minor versions
are not patched.

| Version | Supported |
| --- | :---: |
| the latest minor release | ✓ |
| anything older | ✗ |

## Reporting a vulnerability

Please report it privately, not in a public issue, pull request or discussion: open the
repository's **Security** tab and choose **Report a vulnerability**. That starts a private advisory
only the maintainers can see.

Include what you can of:

- what an attacker can do, and what they need first — an account, a role, a share link, an API key
  or nothing;
- the steps to reproduce it, against a local deployment rather than someone else's;
- the version or commit you tested.

## What to expect

- We aim to acknowledge a report within three working days, and to tell you within ten whether we
  accept it and how severe we judge it.
- We fix accepted reports in private, publish a release with the fix, then publish the advisory,
  crediting you unless you would rather not be named.
- We ask that you keep the details private until the fix is released, and in any case for no more
  than 90 days from your report.

Testing your own deployment is welcome. Do not test against deployments you do not run, and do not
access, change or keep anyone else's data.
