# Installing IsaiahSearch on iPhone

The simulator build artifact from GitHub Actions is for the iOS Simulator and cannot be installed on a physical iPhone.

For a physical iPhone, the app must be signed with an Apple Developer provisioning profile. The supported paths are:
1. TestFlight (recommended for beta testing).
2. An ad hoc or enterprise-signed IPA where the account and device eligibility allow it.

A `.mobileconfig` profile can configure managed settings or install a trust/provisioning profile in supported cases; it does not contain or install the app binary by itself.

After Apple signing credentials and provisioning are configured, the workflow can be extended to archive, export, and publish a signed IPA. Never put Apple certificates, provisioning profiles, or provider API keys in the repository.
