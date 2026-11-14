import { labs as original } from './labs.js';

const text = {
  "l01": {
    "title": "Build an operations group with least privilege",
    "difficulty": "Foundation",
    "summary": "Create a user and security group, grant access within a lab resource group, then verify the boundaries with a second identity.",
    "requirements": [
      "Use a dedicated lab subscription or an authorized lab resource group.",
      "Creating users requires suitable Entra permissions such as User Administrator. Assigning RBAC requires Owner, User Access Administrator, or RBAC Administrator at the target scope.",
      "Use an Assigned security group; no P1 dynamic-membership license is needed."
    ],
    "cost": "Empty resource groups and Assigned security groups do not generate Azure resource-usage charges. A paid license is not required.",
    "steps": [
      [
        "Confirm the directory and lab scope",
        "Confirm your current directory in the portal and record the lab subscription ID. Create an empty rg-az104-identity resource group. Keep subsequent assignments within that scope.",
        "The tenantId matches the Entra overview and the group contains no production resources."
      ],
      [
        "Create a test user",
        "Open Entra ID → Users → New user. Create az104-operator, set Department=Lab and the correct Usage location. Store the initial password securely, sign in through a separate browser session, and change it.",
        "The test user can sign in; no password appears in your notes."
      ],
      [
        "Create a security group",
        "Open Groups → New group, select Security and Assigned, and name it az104-operators. Add the test user as a member and your administrator account as Owner. Record its object ID.",
        "Membership is correct, and you can explain why group ownership is not subscription Owner access."
      ],
      [
        "Verify Reader access",
        "On the resource group, open IAM → Add role assignment and give Reader to the lab group. After propagation, view the group as the test user, then attempt to change its tags.",
        "Viewing succeeds and tag editing fails. Check that the user does not inherit a more powerful role."
      ],
      [
        "Verify Contributor access",
        "As the administrator, use IAM → Check access for the test user and record principal, role, scope, and inheritance. Replace this group's Reader assignment with Contributor at the same resource group, then try tag editing and role assignment.",
        "Tag editing succeeds, but this role alone does not permit RBAC assignments or make the user an Entra administrator."
      ],
      [
        "Audit and revoke access",
        "Find the roleAssignments/write record in the resource group's Activity log. Remove the lab assignment, allow propagation, and refresh the test user's session.",
        "The user can no longer manage the group, and you can explain principal + role definition + scope."
      ]
    ],
    "deliverables": [
      "A Reader / Contributor / Owner comparison.",
      "Two expected-denial results and an explanation of IAM inheritance."
    ],
    "cleanup": [
      "Remove lab role assignments.",
      "Delete the test user and security group after confirming no other lab depends on them.",
      "Delete the empty resource group and clear temporary passwords."
    ],
    "sourceLabels": [
      "Official Microsoft identity lab",
      "Official Microsoft RBAC lab"
    ]
  },
  "l02": {
    "title": "Connect tags, Policy, locks, and budgets",
    "difficulty": "Applied",
    "summary": "Observe deployment denial, tag remediation, deletion locks, and cost notifications to distinguish four governance mechanisms.",
    "requirements": [
      "Permission to create resources, assign Policy, and manage locks within the lab scope.",
      "A Modify policy's managed identity needs tag-write permissions.",
      "Budgets require a supported Cost Management scope and write access; a new subscription may not yet have these features available."
    ],
    "cost": "Small storage usage and transactions can still incur charges. A budget notifies; it does not automatically stop resources.",
    "steps": [
      [
        "Create resources and tags",
        "Create rg-az104-governance and tag the group Project=AZ104. Create a Standard LRS storage account without tags, disable anonymous Blob access, and use a globally unique lowercase alphanumeric name.",
        "The account does not automatically inherit the group's tags."
      ],
      [
        "Deny noncompliant new deployments",
        "In Policy → Definitions, find Require a tag and its value on resources. Assign it only to the lab group with Project / AZ104 parameters. After it takes effect, try another account without the tag, then retry with the required tag.",
        "The failure identifies the policy assignment; validation succeeds with the correct tag."
      ],
      [
        "Remediate an existing resource",
        "Remove the experimental Deny assignment. Assign Inherit a tag from the resource group if missing with Project as the parameter. Create the managed identity, grant required permissions, and create a Remediation task; wait for the result.",
        "The initially untagged account receives Project=AZ104. Explain why remediation differs from a compliance scan."
      ],
      [
        "Test a deletion lock",
        "Add CanNotDelete to the test account, attempt deletion, and observe the denial. Remove this lab lock afterwards. Do not treat it as protection against deleting Blob data.",
        "Record the refusal reason and explain why a management-plane lock does not replace data backup."
      ],
      [
        "Configure a budget",
        "In the lab group's Cost Management → Budgets, create an affordable small monthly budget with actual-cost thresholds of 50%, 80%, and 100%. Notify only your own email and verify currency and billing scope.",
        "The budget is correct; your notes state that costs and notifications can be delayed and an overrun will not stop resources."
      ],
      [
        "Complete a governance diagnosis table",
        "Map missing role permissions, policy violations, deletion locks, and budget overruns to IAM, Policy, Locks, and Cost Management. Record the first evidence you would inspect for each.",
        "You can diagnose from error details and have completed cleanup."
      ]
    ],
    "deliverables": [
      "Policy-denial and tag-remediation records.",
      "A diagnosis table for the four governance problems.",
      "Budget scope, currency, and threshold details."
    ],
    "cleanup": [
      "Remove the lab locks, Policy assignments, and managed identity's lab role assignments.",
      "Delete the dedicated resource group and test budget.",
      "After cost data refreshes, check for continuing lab charges."
    ],
    "sourceLabels": [
      "Official Microsoft Policy lab",
      "Create and manage budgets"
    ]
  },
  "l03": {
    "title": "Authorize Blob access and recover deleted files",
    "difficulty": "Applied",
    "summary": "Separate management and data permissions, generate a temporary read-only SAS, and verify version and soft-delete recovery.",
    "requirements": [
      "Permission to create StorageV2 accounts and assign Blob data roles.",
      "Azure CLI and Bash; use only test text without private data."
    ],
    "cost": "Standard LRS storage, versions, soft-deleted data, and transactions can incur charges. Keep test files to a few KB.",
    "steps": [
      [
        "Configure a test account",
        "Create rg-az104-blob and a StorageV2 account using Standard, LRS, and Hot. Disable anonymous access and leave hierarchical namespace off. In Data protection, enable Blob soft delete and versioning and record a short retention period.",
        "Account and protection settings are clear, and container access is Private."
      ],
      [
        "Authorize your signed-in identity",
        "Assign Storage Blob Data Contributor to your account at the test storage-account scope and allow propagation. Replace the account-name placeholder in the Bash variable, then run the command with --auth-mode login.",
        "Container creation succeeds; explain why Contributor alone does not directly grant Blob data permissions."
      ],
      [
        "Upload two versions",
        "Create local note.txt containing version one and upload it. Change the contents to version two and repeat the same command. Open the blob's Versions view.",
        "The current content is version two and the previous version and its ID are visible."
      ],
      [
        "Generate a short-lived read-only SAS",
        "In Blob → Generate SAS, select User delegation key, Read only, HTTPS, and a one-hour lifetime. Test in a private browser window. If generation fails, check account-level generateUserDelegationKey permission and propagation.",
        "The link reads the intended blob only. Record permissions and expiry, never the token."
      ],
      [
        "Delete and recover",
        "Delete current note.txt and inspect Versions: with versioning enabled, the current version becomes a previous version and no current version remains. Promote/copy the desired historical version to current and download to verify. Then delete an unneeded previous version, display deleted versions, and perform Undelete on the blob to recover that version.",
        "You recover the intended content and distinguish restoring a soft-deleted object from restoring a previous version."
      ],
      [
        "Explain three access boundaries",
        "Describe the roles of RBAC, network firewalls, and SAS expiry. Explain why a reachable network does not guarantee data authorization, and correct data permissions can still be blocked by network rules.",
        "Each judgment has a clear reason, and no complete SAS remains after cleanup."
      ]
    ],
    "deliverables": [
      "Two uploads and a verified recovery of the chosen content.",
      "A management-plane / data-plane / network-boundary comparison.",
      "SAS permissions and expiry without the token."
    ],
    "cleanup": [
      "Delete the dedicated group containing only test data.",
      "Remove unneeded test data-role assignments.",
      "Clear temporary SAS values, clipboard contents, and local test files."
    ],
    "sourceLabels": [
      "Blob data roles and permissions",
      "Blob versioning",
      "Blob soft delete",
      "SAS permissions and signatures"
    ]
  },
  "l04": {
    "title": "File shares, AzCopy, and lifecycle management",
    "difficulty": "Applied",
    "summary": "Restore an Azure Files snapshot, transfer a blob with AzCopy, and define lifecycle rules with explicit scope and time thresholds.",
    "requirements": [
      "Permission to create a Standard LRS StorageV2 account and access lab data.",
      "AzCopy v10 and local file creation. Mounting SMB is not required."
    ],
    "cost": "Shares, snapshots, blobs, and transactions can incur charges. Use text files only and do not archive short-lived lab data.",
    "steps": [
      [
        "Create a file share",
        "Create a storage account in rg-az104-files. Under File shares, create labshare with a small quota. Upload hello.txt containing original through the portal. If access is denied, check the current data authorization method instead of copying keys into notes.",
        "The file is visible and downloadable. Record the protocol and quota."
      ],
      [
        "Restore from a share snapshot",
        "Create a share snapshot, change current hello.txt to changed, and upload it. Browse the old snapshot, download its file, and restore that file to the current share.",
        "Current content returns to original; the snapshot did not change with the live file."
      ],
      [
        "Sign in to AzCopy",
        "Assign yourself Storage Blob Data Contributor at the lab-account scope and create private Blob container transfer. Install official AzCopy v10, replace TENANT_ID with the tenant GUID, and sign in.",
        "Version 10 works, the tenant is correct, and role propagation is complete."
      ],
      [
        "Copy and verify a file",
        "Prepare ./sample.txt and replace ACCOUNT in the command with the account name. Copy it, inspect the job summary, then download the target through the portal and compare. Do not generalize Blob OAuth behavior to every SMB identity setup.",
        "The job is Completed with zero failures, and downloaded content matches the source."
      ],
      [
        "Configure lifecycle rules",
        "Add a lifecycle rule matching only transfer/ and Block blobs. Move current versions to Cool thirty days after modification and delete after ninety days. Verify the rule JSON instead of waiting thirty days; never set real-data deletion thresholds to zero for a quick result.",
        "The prefix includes the container name, and you understand asynchronous execution and early-deletion charges for cooler tiers."
      ],
      [
        "Choose storage for requirements",
        "Choose a service and protection method for shared files, object archives, regional failure, and accidental deletion. Explain why redundant copies do not replace historical recovery points.",
        "Each choice has a reason; LRS is not described as cross-region protection."
      ]
    ],
    "deliverables": [
      "Share-snapshot recovery evidence.",
      "AzCopy job summary and content comparison.",
      "Lifecycle JSON and a requirement-to-service comparison."
    ],
    "cleanup": [
      "Delete the dedicated storage group and unneeded lab roles.",
      "Run azcopy logout and remove local test files.",
      "Check that snapshots and versions have not been left behind."
    ],
    "sourceLabels": [
      "AzCopy v10 documentation",
      "Blob lifecycle management",
      "Official Microsoft storage lab"
    ]
  },
  "l05": {
    "title": "VMs, data disks, and repeatable deployments",
    "difficulty": "Applied",
    "summary": "Create a small lab VM, observe compute and disk lifecycles, and verify declarative deployment with a compact Bicep template.",
    "requirements": [
      "Contributor access in the lab, regional VM quota, and an available SKU.",
      "Azure CLI and Bicep; a working VM agent for Run command. Public SSH/RDP is not required."
    ],
    "cost": "Running VMs, disks, and public IPs may incur charges. Deallocation stops compute billing but retains charges such as disks.",
    "steps": [
      [
        "Create a small VM",
        "Create rg-az104-compute and deploy an available small Ubuntu LTS VM through the portal after reviewing estimated costs. Do not open inbound management ports. Configure explicit outbound access for Run command: attach a temporary Standard public IP while keeping all public inbound closed, or reuse an approved outbound path. Record region, size, and zone or absence of a zone; note unsupported zones for inexpensive SKUs.",
        "The VM is Running; explain the different failure boundaries of zones and availability sets."
      ],
      [
        "Inspect the OS without changing it",
        "Open VM → Run command → RunShellScript and run the commands. If the agent is unhealthy, check its supported connectivity and explicit outbound access rather than opening inbound access to everyone.",
        "Identify OS and temporary disks, and do not use the temporary disk for persistent data."
      ],
      [
        "Attach a data disk",
        "Under Disks, add a small Standard SSD, save, and run lsblk again. Record the new device, capacity, and LUN. Identify the disk only; do not run formatting commands that could target the wrong device.",
        "The Azure disk matches the new guest device. Attaching does not mean a usable filesystem has been created."
      ],
      [
        "Prepare Bicep",
        "Save the supplied code as main.bicep. It deploys only a dedicated NSG so you can inspect templates at low cost. No VM password export is needed.",
        "Explain parameters, resource, API version, properties, and output."
      ],
      [
        "Preview and repeat deployment",
        "Sign in through Bash, confirm the subscription, and run the commands. Run what-if again after deployment, then change only the Project tag and inspect the difference. Keep the default incremental mode rather than switching to Complete.",
        "The first preview creates an NSG; repetition causes no unexpected deletion, and the tag change is visible."
      ],
      [
        "Stop, deallocate, and plan scaling",
        "Stop the VM in the portal until it shows Stopped (deallocated), and confirm disks still exist. Inspect available resize options without actually upgrading. Sketch a VMSS multi-instance design with health checks, scaling signals, and externalized state.",
        "Distinguish guest shutdown from Azure deallocation, list remaining charges, and explain VMSS trade-offs."
      ]
    ],
    "deliverables": [
      "VM/disk configuration table and lsblk output.",
      "main.bicep, what-if, and deployment evidence.",
      "Billing boundaries after stopping and a VMSS diagram."
    ],
    "cleanup": [
      "Delete the dedicated group and check disks, NICs, and public IPs for leftovers.",
      "Keep private keys private; do not commit them.",
      "Search All resources by the lab prefix."
    ],
    "sourceLabels": [
      "Official Microsoft VM lab",
      "Deploy Bicep with Azure CLI"
    ]
  },
  "l06": {
    "title": "App Service slots and a container deployment",
    "difficulty": "Advanced",
    "summary": "Complete a reversible web-app release, deploy ACI, and compare three application hosting models.",
    "requirements": [
      "Permission and sufficient regional quota to create App Service and ACI.",
      "Slots require a Standard, Premium, or Isolated plan; Free and Basic do not support them.",
      "Prepare release-a.zip and release-b.zip with index.html directly at each archive root, containing release-a and release-b respectively."
    ],
    "cost": "A Standard plan is billed even when its web app is stopped. ACI incurs runtime charges. Finish in one session and delete the dedicated plan immediately.",
    "steps": [
      [
        "Create a Windows web app",
        "In rg-az104-web, create a Windows App Service plan with Standard S1 or another suitable tier supporting slots. Choose a .NET runtime for the web app so IIS can serve static files. Review estimated charges first.",
        "Record the plan's region, OS, and SKU; its default HTTPS address opens."
      ],
      [
        "Deploy production and staging",
        "Replace APP_NAME, deploy package a to production, create staging with the CLI (do not create it a second time in the portal), and deploy package b there. If the tenant restricts this method, follow the official lab for a supported deployment option.",
        "The two hostnames show a and b respectively, with staging initially receiving 0% of routed traffic."
      ],
      [
        "Swap and roll back",
        "Set LAB_ENV to production and staging in the respective slots and mark it Deployment slot setting. Record values, start Swap from Deployment slots, review source, target, and differences, then open both URLs. Swap again to roll back.",
        "Content swaps, sticky settings stay in their original slot, and sensitive configuration is not exposed on the page."
      ],
      [
        "Deploy ACI",
        "Create a Linux Container instance in the same group using public sample image mcr.microsoft.com/azuredocs/aci-helloworld. Choose 1 vCPU and 1 GB, or the smallest permitted configuration, TCP 80, and a unique DNS label.",
        "The container is Running, the page opens, and logs and restart counts are visible."
      ],
      [
        "Compare hosting models",
        "Inspect ACI restart policy and CPU/memory. Read the Container Apps wizard's environment, revision, ingress, and scaling settings without submitting additional resources. Explain the relationships among App Service, ACI, Container Apps, and ACR.",
        "Your comparison covers releases, scaling, image sources, and suitable scenarios."
      ],
      [
        "Check networking and scaling",
        "Inspect App Service HTTPS Only, TLS, Custom domains, Networking, and Scale up/out. Explain domain verification, changing SKU, and adding instances. You do not need to buy a domain or certificate.",
        "Explain VNet integration for outbound access and private endpoints for private inbound access, then complete cleanup."
      ]
    ],
    "deliverables": [
      "Swap, rollback, and sticky-setting evidence.",
      "ACI Running state and page verification.",
      "An application-platform comparison."
    ],
    "cleanup": [
      "Delete rg-az104-web and confirm the plan, slots, and ACI are gone.",
      "Check for separate log resources or accidentally created plans.",
      "Retain only archives and notes without secrets."
    ],
    "sourceLabels": [
      "App Service deployment slots",
      "Official Microsoft Web Apps lab",
      "Official Microsoft ACI lab"
    ]
  },
  "l07": {
    "title": "From IP planning to verified NSG rules",
    "difficulty": "Applied",
    "summary": "Build two subnet tiers and use effective rules and IP flow verify to explain allowed and denied flows.",
    "requirements": [
      "Network write permissions, a running small lab VM, and Network Watcher.",
      "Address ranges must not overlap existing networks; do not apply the example directly to a company network."
    ],
    "cost": "VNets and NSGs generally have no hourly charge themselves; VMs, logs, and additional diagnostics may incur charges.",
    "steps": [
      [
        "Plan addresses",
        "Use VNet 10.104.0.0/16, web subnet 10.104.1.0/24, and data subnet 10.104.2.0/24. Create them in a dedicated group and calculate total and reserved addresses for each /24.",
        "Ranges do not overlap; /24 has 256 addresses, five reserved by Azure, leaving 251 assignable."
      ],
      [
        "Associate a subnet NSG",
        "Attach an NSG to the data subnet. Add an inbound priority-200 rule allowing TCP 5432 from 10.104.1.0/24 to 10.104.2.0/24. At priority 300, deny any port from VirtualNetwork to Any.",
        "Direction, addresses, and ports are correct; custom rules precede default AllowVNetInBound."
      ],
      [
        "Place a test VM",
        "Deploy a small Ubuntu VM in the data subnet without public inbound access. Configure explicit outbound for the agent and Run command through a temporary Standard public IP or an approved existing path. To isolate variables, avoid an additional NIC NSG; understand any one the portal created before changing this lab's resources. Check agent and Network Watcher availability.",
        "The NIC is in the correct subnet and Effective security rules shows the expected NSG."
      ],
      [
        "Verify an allowed flow",
        "In Network Watcher → IP flow verify, select the VM, Inbound, and TCP. Use its private IP and local port 5432; remote IP 10.104.1.10 and port 50000. This checks rules, so the remote address need not belong to an actual VM.",
        "The result is Allow and identifies the custom rule. This does not prove a database service is listening."
      ],
      [
        "Create a priority conflict",
        "First change the local port to 22 and observe Deny. Add a temporary priority-100 Deny for TCP 5432 and retry the original flow; remove that fault rule and retest. Use new tests instead of inferring behavior from existing connection state.",
        "The original flow follows Allow → Deny → Allow; the lower priority number matches first."
      ],
      [
        "Separate network rules from the service",
        "Run ss -lnt using VM Run command and check whether a process listens on 5432. Describe both NSG-allowed/no-listener and listening-service/NSG-denied cases. Sketch an ASG-based alternative to explicit IP prefixes.",
        "Troubleshooting separates routes, NSGs, OS firewalls, and listeners without using an Any/Any workaround."
      ]
    ],
    "deliverables": [
      "Address calculations.",
      "Three IP flow verify results and matching rules.",
      "A flow diagram through subnet and NIC NSGs."
    ],
    "cleanup": [
      "Delete the lab VM, disks, NICs, and dedicated network group.",
      "Keep any shared Network Watcher; remove only lab diagnostics.",
      "Check for leftover public IPs or open management ports."
    ],
    "sourceLabels": [
      "NSG rules and stateful behavior",
      "Official Microsoft networking lab"
    ]
  },
  "l08": {
    "title": "Peering, routing, and a private Blob endpoint",
    "difficulty": "Advanced",
    "summary": "Connect two VNets, verify private DNS resolution, and test the separate effects of public access and data authorization.",
    "requirements": [
      "Permission to manage both VNets, peering, private endpoints, Private DNS, and storage.",
      "A test VM with Run command and nonoverlapping networks."
    ],
    "cost": "Private endpoints have hourly and data charges; VM, DNS, and peering traffic may also cost money. Clean up the same day.",
    "steps": [
      [
        "Create networks and a client",
        "In rg-az104-private, create client VNet 10.108.0.0/16 and service VNet 10.109.0.0/16, each with a /24 subnet. Deploy a small client VM with no public inbound access. Use a temporary Standard public IP or approved outbound path so Run command returns results. That public IP does not change the later private Blob DNS resolution.",
        "Record both VNet IDs and the VM's private IP; the ranges do not overlap."
      ],
      [
        "Configure peering both ways",
        "Create client-to-service and service-to-client peerings with VNet access allowed. Inspect connection state and the client VM's Effective routes.",
        "Both sides are Connected and a route to the remote peer exists. Explain why A-B and B-C do not automatically connect A-C."
      ],
      [
        "Create a Blob endpoint",
        "Create a Standard LRS StorageV2 account. Under Networking → Private endpoint connections, add an endpoint for blob in the service subnet. Enable DNS integration with privatelink.blob.core.windows.net.",
        "The connection is Approved; record the endpoint NIC's private IP. The file subresource would need its own endpoint."
      ],
      [
        "Link client DNS",
        "Link the private zone to the client VNet too, normally without automatic registration. Query the normal service hostname through VM Run command after replacing ACCOUNT. Do not hard-code the private IP in application connection strings.",
        "The result is the endpoint's 10.109.x.x address. If it is public, first check zone links and DNS forwarding."
      ],
      [
        "Separate connectivity and authorization",
        "Make an HTTPS request from the VM. An anonymous 400/403 may show the service responded, but it does not prove data permission. To read a file, assign Blob Data Reader to the test identity and use signed-in access from a reachable client.",
        "Record DNS, TCP/TLS, HTTP status, and data-reading results separately. Do not classify every 403 as network failure."
      ],
      [
        "Disable the public entry point",
        "Set Public network access on the account to Disabled. Recheck the private path from the VM, then check public reading from a personal computer without a VPN connection. Correct identity permissions cannot bypass network restrictions.",
        "Creating a private endpoint did not itself disable public access; private access still needs data permissions."
      ],
      [
        "Understand route association",
        "Inspect local, peering, and default effective routes. Create an unattached route table with 10.200.0.0/16 → None. Explain why it affects no subnet until associated; do not create a black-hole default route.",
        "Explain longest-prefix matching, next hops, and route-table association."
      ]
    ],
    "deliverables": [
      "Connected peering and effective-route evidence.",
      "DNS resolution to the private IP.",
      "A private/public/RBAC verification matrix."
    ],
    "cleanup": [
      "Delete the client VM, private endpoint, and dedicated group.",
      "Check DNS zones, links, route tables, and disks for leftovers.",
      "Do not delete a DNS zone shared with other networks."
    ],
    "sourceLabels": [
      "Storage private endpoints",
      "Official Microsoft intersite-connectivity lab"
    ]
  },
  "l09": {
    "title": "Make load-balancer health probes work",
    "difficulty": "Advanced",
    "summary": "Place two backends behind a Standard load balancer and distinguish application, probe, and NSG failures.",
    "requirements": [
      "Permission to create Standard LB, Standard public IPs, and two small Ubuntu VMs.",
      "VMs need explicit outbound connectivity for the agent and package installation: temporary Standard public IPs with public management inbound closed, or an existing approved outbound path."
    ],
    "cost": "Both VMs, disks, the load balancer, and public IPs incur charges. Work in one session and clean up immediately.",
    "steps": [
      [
        "Build frontend and backends",
        "In rg-az104-lb, create a VNet, backend subnet, and web-a/web-b VMs. Create a Standard public LB with a Standard static public IP, then add each VM NIC's IP configuration to its backend pool.",
        "The frontend and pool exist; do not use the retired Basic SKU."
      ],
      [
        "Start HTTP services",
        "Use Run command on both VMs to install nginx and put the hostname in the home page. Verify explicit outbound first; if apt fails, inspect networking rather than repeatedly reinstalling.",
        "Each VM's local HTTP response returns its own name, web-a or web-b."
      ],
      [
        "Allow clients and probes",
        "In backend NSGs, allow only your current public IP/32 to TCP 80. Retain or add the AzureLoadBalancer service-tag allowance for probes and ensure a higher-priority deny does not override it. Check both NIC and subnet NSGs.",
        "Effective rules allow the client and probe; SSH/RDP is not open to everyone."
      ],
      [
        "Connect the rule and probe",
        "Create an HTTP probe on port 80 and path /. Add a TCP 80-to-80 rule linked to the frontend, pool, and probe. Wait for healthy backends, then open the LB IP from your computer.",
        "The page opens and health metrics are good. Distribution is connection-based, not guaranteed request-by-request alternation."
      ],
      [
        "Stop one backend",
        "Run systemctl stop nginx on web-a, wait for probe failure, and request the frontend using new connections. Afterwards run systemctl start nginx and watch recovery.",
        "The failed backend stops receiving new traffic while the other responds; the restored backend becomes healthy."
      ],
      [
        "Diagnose by layer",
        "Use Network Watcher Connection troubleshoot and IP flow verify for the TCP 80 path. Set the probe path to /not-found, observe a non-200 failure, then restore /.",
        "Distinguish a wrong probe configuration, an NSG denial, and an application not listening."
      ],
      [
        "Explain inbound and outbound paths",
        "Draw the frontend IP, backend private IPs, probe, and rule. Explain why layer 4 does not route by URL path and why inbound load balancing does not by itself configure the application's required outbound access.",
        "The diagram explicitly identifies this lab's outbound method and cleanup is complete."
      ]
    ],
    "deliverables": [
      "Distinct backend pages and health metrics.",
      "Evidence for nginx failure and a wrong probe path.",
      "An inbound/outbound flow diagram."
    ],
    "cleanup": [
      "Delete the dedicated group, all VMs, disks, LB, and Standard public IPs.",
      "Remove separately created diagnostic or log resources.",
      "Confirm no continuing resource usage after cost data updates."
    ],
    "sourceLabels": [
      "Azure Load Balancer overview and SKUs",
      "Official Microsoft traffic-management lab"
    ]
  },
  "l10": {
    "title": "From Activity Log to KQL and alert notifications",
    "difficulty": "Applied",
    "summary": "Build a verifiable chain from a management operation through log collection and KQL to a real alert and notification.",
    "requirements": [
      "Permission to create Log Analytics, diagnostic settings, alert rules, and an action group.",
      "Exporting subscription Activity Logs requires suitable subscription-level permissions. Send test notifications only to your email."
    ],
    "cost": "Log ingestion/retention and some alert notifications may incur charges. Collect only required categories and turn them off promptly.",
    "steps": [
      [
        "Create a workspace",
        "Create a Log Analytics workspace in rg-az104-monitor. Review its region, retention, and Usage and estimated costs. Use lab-appropriate retention instead of importing all production logs.",
        "Logs opens, and you understand the workspace as a storage and query scope."
      ],
      [
        "Export management events",
        "In the lab subscription, open Activity log → Export Activity Logs / Diagnostic settings. Create a lab setting sending only Administrative to the new workspace. If you lack permissions, an administrator of the lab subscription must perform this step.",
        "The destination workspace is correct. Distinguish Activity Log from resource diagnostic logs."
      ],
      [
        "Generate and query an event",
        "Change the lab group's tag to LabRun=monitor-test and record the time. Find the event in the portal first, then wait for export ingestion and run the KQL. Initial ingestion can be delayed; zero rows does not immediately prove misconfiguration.",
        "Find the operation. If the table is absent, check destination, time range, and ingestion delay."
      ],
      [
        "Aggregate logs",
        "Run the summary query, then try filtering ActivityStatusValue == \"Failure\". Zero failures is a valid result; do not create a fault on a production resource.",
        "Explain where, project, summarize, count, and the time window."
      ],
      [
        "Test the notification channel",
        "Create ag-az104 with only your email. Use Test action group, inspect inbox and spam, and record delivery delay.",
        "A test arrives; explain why that does not yet prove the real alert condition will trigger."
      ],
      [
        "Trigger a real alert",
        "From the Activity Log event, choose Create alert rule. Limit scope to the lab group, select the corresponding write operation with Succeeded status, and associate ag-az104. Change the tag again and inspect the resulting instance in Monitor → Alerts.",
        "The real alert matches the event's resource and time, and its notification arrives."
      ],
      [
        "Distinguish metrics and guest logs",
        "Inspect Metrics for a lab resource. Record the different sources for platform metrics, Activity Log, and guest logs. Guest collection needs configuration such as Azure Monitor Agent and DCRs; a workspace alone is insufficient.",
        "Choose the correct source for three scenarios, then disable lab collection and clean up."
      ]
    ],
    "deliverables": [
      "Two working KQL queries and result summaries.",
      "One test notification and one real alert.",
      "A table of three monitoring data sources."
    ],
    "cleanup": [
      "Remove the subscription-level diagnostic export first to stop further ingestion.",
      "Delete the alert, action group, dedicated workspace, and resource group.",
      "If you added AMA or DCRs, remove only the lab configuration."
    ],
    "sourceLabels": [
      "Create Activity Log alerts",
      "Official Microsoft monitoring lab"
    ]
  },
  "l11": {
    "title": "Complete a real restore and design a recovery drill",
    "difficulty": "Advanced",
    "summary": "Create a VM recovery point, restore disks, verify a file, and design an isolated Site Recovery test.",
    "requirements": [
      "Protect only a dedicated lab VM; have permissions for Recovery Services vaults and VM Backup.",
      "Prepare an isolated same-region restore group and staging storage as required by the wizard. Jobs may outlast one study session.",
      "Review soft delete, retention, and immutability first. Do not irreversibly lock an immutable vault for a short lab."
    ],
    "cost": "Protected instances, backups, and restored disks/VMs may incur charges. Soft-delete retention may prevent immediate cleanup. ASR is design-only here by default.",
    "steps": [
      [
        "Write identifiable test data",
        "Create the test file on the lab VM's OS disk. Record region, disk type, encryption, and agent state. Do not select a business VM.",
        "Save the content and path so you can identify the recovery point."
      ],
      [
        "Configure a same-region backup",
        "Create a Recovery Services vault in the VM's region. Before protection, check redundancy, soft delete, and immutability. Enable VM backup with a clear daily time, time zone, and short retention policy; record its retention deadline.",
        "The VM appears in Backup items. Explain why Backup vault and Recovery Services vault are not interchangeable."
      ],
      [
        "Create a recovery point",
        "Run Backup now and wait for Backup jobs to show Completed. Record recovery-point time and consistency type. Study another topic while waiting, but do not check this step before success.",
        "An actual recovery point exists, not just a configured policy."
      ],
      [
        "Restore into an isolated group",
        "Choose the recovery point → Restore VM → Restore disks. Target new rg-az104-restore and provide staging storage as directed. Do not overwrite existing disks. Wait, then inspect the new disks and deployment template.",
        "Restore is Completed; disks are in the isolated scope. Record duration and resource count."
      ],
      [
        "Verify recovered data",
        "Use the generated template or restore wizard to create a temporary VM from the restored OS disk without conflicting names or IPs. Read the file through Run command. Accept recovery only when the expected content is visible.",
        "Contents match the original marker. Record total recovery time and explain RPO and RTO."
      ],
      [
        "Design an ASR test",
        "Read the official Azure-to-Azure tutorial. Draw the source VM, cache storage, target replica disks, vault, and isolated test VNet. Order test failover, app validation, test cleanup, real failover, and failback. This step is design-only; starting replication requires a separate cost and quota check.",
        "Distinguish historical backup recovery from ASR continuity, including replication health, RPO, and test isolation."
      ],
      [
        "Handle cleanup dependencies",
        "Delete restored VMs/disks. Stop protection for the test-only Backup item and handle data according to the chosen retention process. Check soft-deleted items, locks, and dependencies. Deleting the source VM alone does not prove backup charges have stopped.",
        "If the vault cannot yet be deleted, record dependencies, expiry dates, and pending work. Do not mark cleanup complete prematurely."
      ]
    ],
    "deliverables": [
      "Successful backup, successful restore, and verified file content.",
      "Recovery duration and an RPO/RTO explanation.",
      "An isolated ASR test diagram and cleanup dependency table."
    ],
    "cleanup": [
      "Delete restored VMs, disks, NICs, staging storage, and the restore group.",
      "Stop lab backups and handle data under retention/soft-delete rules, keeping pending work during waiting periods.",
      "Delete the dedicated vault only after protected items, soft-deleted items, and dependencies are gone. Do not change production-vault security.",
      "If you implemented ASR independently, stop replication and remove cache, target disks, and test resources too."
    ],
    "sourceLabels": [
      "Official Microsoft data-protection lab",
      "Azure-to-Azure Site Recovery",
      "Vault deletion dependencies"
    ]
  },
  "l12": {
    "title": "Capstone: deliver a manageable Azure environment",
    "difficulty": "Capstone",
    "summary": "Complete a small delivery from requirements to acceptance. Verify the core implementation; label higher-cost disaster recovery explicitly as design-only if appropriate.",
    "requirements": [
      "Complete foundational identity, storage, compute, networking, and monitoring labs first.",
      "Use a dedicated group and appropriate access. Decide a cost limit and cleanup time before starting.",
      "Handover notes must not contain passwords, keys, SAS tokens, or real user data."
    ],
    "cost": "The core uses a small VM, storage, and monitoring. Private endpoints, LB, and ASR are optional extensions when budget permits. Budget alerts do not cap spending.",
    "steps": [
      [
        "Write testable requirements",
        "Scenario: a small team stores project files while operations manages one Linux tools VM. Require least privilege, Project tags, recoverable files, auditable changes, and same-day cleanup. List resources, permissions, addresses, recovery methods, and costs.",
        "Each requirement has an observable result rather than just a claim that configuration is complete."
      ],
      [
        "Deploy networking through a template",
        "Extend the l05 Bicep template with a VNet, subnet, and NSG using nonoverlapping addresses. Review what-if, then deploy to rg-az104-capstone. Add Project=AZ104 and Environment=Lab to resources supporting tags.",
        "The template redeploys without unexpected deletion and tags are complete."
      ],
      [
        "Verify least privilege",
        "Give observers Reader and file operators Blob Data Contributor limited to lab storage. Inspect inheritance with IAM Check access, then test resource management and data access separately.",
        "At least one expected success and one expected failure have actual evidence."
      ],
      [
        "Deploy and recover data",
        "Deploy a small Ubuntu VM with no public management ports and working agent connectivity. Create a private Blob container, test file, versioning/soft delete, then overwrite and restore a previous version. Inspect VM disks and networking with Run command.",
        "The VM works, file recovery is correct, and temporary disks are not used for persistent data."
      ],
      [
        "Connect monitoring",
        "Follow l10 for minimal log collection. Query this project's management operations and create a lab-scoped alert with your action group. Trigger one event and record notification delay.",
        "Query results, alert instance, and notification align in time."
      ],
      [
        "Handle three faults",
        "In sequence, revoke the test data role to observe authorization failure; add a higher-priority NSG Deny and diagnose with IP flow verify; then delete and recover a blob. Record symptom, hypothesis, evidence, repair, and retest. Restore configuration after each exercise.",
        "Each incident has an evidence chain and only one variable changes at a time."
      ],
      [
        "Prepare the handover",
        "Organize architecture, permission scopes, cost, restore steps, KQL, and templates. Explain regional failure, budget overruns, data access, and restore verification in five minutes. Mark cross-region ASR as not implemented when it is design-only.",
        "Explain your choices independently and do not present a design as a completed recovery drill."
      ],
      [
        "Accept cleanup",
        "First remove subscription collection and lab role assignments. Check locks, backup, and retention dependencies, then delete the dedicated group. Search all resources by Project and naming prefix and record when to recheck charges.",
        "Check off only actual deletions; retention-delayed resources have explicit expiry dates and pending tasks."
      ]
    ],
    "deliverables": [
      "Architecture, templates, and resource/permission inventories.",
      "Three incident records, real alert evidence, and file-recovery proof.",
      "Five-minute explanation notes and cost/cleanup results."
    ],
    "cleanup": [
      "Remove subscription collection, lab budgets, and role assignments.",
      "Resolve locks, backup retention, and optional-extension dependencies.",
      "Delete the dedicated group and lab identity objects outside resource groups.",
      "Mark the capstone complete only when every cleanup item is actually done."
    ],
    "sourceLabels": [
      "Official Microsoft AZ-104 lab directory",
      "Deploy Bicep",
      "Azure Monitor Activity Log alerts"
    ]
  }
};

// Stable IDs, timing, source URLs, and executable commands are shared across languages.
export const labs = original.map(item => {
  const t = text[item.id];
  if (!t) throw new Error('Missing English lab: ' + item.id);
  return { ...item, title: t.title, difficulty: t.difficulty, summary: t.summary, requirements: t.requirements, cost: t.cost, steps: item.steps.map((step, i) => ({ ...step, title: t.steps[i][0], body: t.steps[i][1], verify: t.steps[i][2] })), deliverables: t.deliverables, cleanup: t.cleanup, sources: item.sources.map((source, i) => ({ ...source, label: t.sourceLabels[i] })) };
});

