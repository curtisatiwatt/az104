import * as original from './curriculum.js';

const text = {
  "domains": [
    [
      "Identity & governance",
      "Understand permission boundaries and keep configuration, organization, and costs under control."
    ],
    [
      "Storage management",
      "Choose redundancy and access methods, protect data, and manage its lifecycle."
    ],
    [
      "Compute resources",
      "Deploy virtual machines, containers, and web apps, then repeat deployments through code."
    ],
    [
      "Virtual networking",
      "Troubleshoot connectivity from addresses and routes through security rules and DNS."
    ],
    [
      "Monitoring & recovery",
      "Collect evidence, trigger alerts, and prove backups work through restore exercises."
    ]
  ],
  "lessons": {
    "id01": {
      "title": "Users, groups, and self-service password reset",
      "summary": "Establish where an identity belongs before organizing access, assigning permissions, or recovering an account.",
      "sections": [
        [
          "Tenants, users, and guests",
          "A Microsoft Entra tenant stores identities. An Azure subscription uses identities from its tenant to authorize resource access. Creating an employee account and inviting a partner are different operations; inviting a guest does not grant access to virtual machines or storage.",
          [
            "Identify principals by object ID; display names may be duplicated.",
            "When troubleshooting, check the current directory, signed-in account, and subscription."
          ]
        ],
        [
          "Organize access through groups",
          "Create a security group for an operations team and assign resource roles to that group to reduce maintenance when people join or leave. Assigned membership is maintained by an administrator; dynamic membership follows attribute rules and has licensing requirements. Microsoft 365 groups support collaboration, so do not assume all group types behave identically.",
          []
        ],
        [
          "Licenses and properties",
          "Licenses determine which product features a user can use; Azure RBAC determines which Azure resources they can operate. Before assigning licenses, check usage location, available seats, and service plans. For a failed assignment, read the specific error before checking properties or conflicts. Changes to attributes such as department can affect dynamic membership.",
          []
        ],
        [
          "The complete SSPR path",
          "Enabling self-service password reset is only part of the setup. The user must be in scope, have registered enough verification methods, and meet licensing requirements. With hybrid identities, distinguish passwords stored on premises from those in the cloud; writing a password back on premises also requires password writeback prerequisites.",
          [
            "Practice: register verification methods for a test user and complete a password reset.",
            "Verify: explain three reasons a user might be unable to reset a password even though SSPR is enabled."
          ]
        ]
      ],
      "pitfalls": [
        "Entra administrator roles and Azure resource roles belong to different authorization systems.",
        "Guest status, group membership, and licenses do not automatically grant resource access."
      ],
      "checks": [
        "Distinguish users, groups, service principals, and managed identities.",
        "List the SSPR checks for scope, registration, licensing, and writeback."
      ],
      "sourceLabels": [
        "Create and invite users",
        "How SSPR works"
      ]
    },
    "id02": {
      "title": "RBAC: roles, scopes, and effective permissions",
      "summary": "Explain every role assignment as who, which permissions, and where.",
      "sections": [
        [
          "The three parts of an assignment",
          "A security principal can be a user, group, service principal, or managed identity. The role definition lists allowed operations, while the scope sets the authorization boundary. To let an application read one container, prefer an appropriate data role at that container's scope. Do not begin by granting subscription Owner and then look for restrictions.",
          []
        ],
        [
          "Inheritance and additive permissions",
          "Scopes inherit from management group to subscription, resource group, and resource. Ordinary role assignments are additive: a user with Contributor at subscription scope does not become read-only because Reader is also assigned on one resource group. Draw the scope tree, then combine direct assignments and group-derived access.",
          []
        ],
        [
          "Common role boundaries",
          "Owner can manage resources and access assignments. Contributor can manage most resources but generally cannot manage role assignments. Reader is for viewing. Access management roles such as User Access Administrator manage authorization. Check the role definition for exact Actions.",
          [
            "NotActions subtracts operations from that role's allowed set; it is not a global deny.",
            "A deny assignment can restrict access that would otherwise be allowed; it is not equivalent to an ordinary Reader assignment."
          ]
        ],
        [
          "Management plane and data plane",
          "Seeing a storage account in the portal does not mean you can read its blobs. Managing resource configuration and reading object data require separate evaluation of Actions and DataActions. For access failures, check principal, tenant, scope, role type, and propagation time, then check network restrictions.",
          []
        ]
      ],
      "pitfalls": [
        "Reader at a lower scope does not override Contributor at a higher scope.",
        "Storage Account Contributor is not Storage Blob Data Contributor."
      ],
      "checks": [
        "Calculate effective permissions, including group inheritance.",
        "Choose a minimal data role and scope for reading only one container."
      ],
      "sourceLabels": [
        "How Azure RBAC works",
        "Azure built-in roles"
      ]
    },
    "id03": {
      "title": "Policy, tags, and resource locks",
      "summary": "Govern configuration compliance, resource classification, and protection against accidental operations.",
      "sections": [
        [
          "The Policy workflow",
          "Define a rule, then assign its definition or an initiative at a scope. When a requirement permits only certain regions, use a policy to evaluate resource properties. Audit records noncompliance; Deny blocks requests that do not meet the condition. Existing resources are not necessarily modified automatically by a new assignment.",
          []
        ],
        [
          "Remediate existing resources",
          "Modify and DeployIfNotExists can perform specific remediation, but evaluation, managed identity permissions, and the remediation task are separate parts. Seeing noncompliance after assignment does not mean remediation has run. Test within a small scope before applying a rule that could block valid resources.",
          []
        ],
        [
          "What tags can and cannot do",
          "Use tags such as Environment, Owner, and CostCenter for queries and cost allocation. Resource group tags are not copied to member resources by default; use explicit configuration or an applicable policy. Tags are metadata, not a replacement for RBAC, and should not contain passwords or sensitive personal data.",
          []
        ],
        [
          "How locks behave",
          "CanNotDelete prevents deletion while permitting authorized changes. ReadOnly restricts control-plane updates; some operations that appear to read data also use POST. Locks inherit from parent scopes. They do not protect every data-plane operation, so Blob deletion still requires suitable authorization and data protection.",
          []
        ]
      ],
      "pitfalls": [
        "A policy assignment does not grant a role; both authorization and policy must allow an operation.",
        "A ReadOnly lock may affect operations such as starting, stopping, or listing keys."
      ],
      "checks": [
        "Choose the right mechanism for region restrictions, cost classification, and deletion protection.",
        "Explain why locking a storage account does not protect every blob operation."
      ],
      "sourceLabels": [
        "Azure Policy",
        "Resource locks",
        "Resource tags"
      ]
    },
    "id04": {
      "title": "Subscriptions, resource groups, and cost governance",
      "summary": "Align resource lifecycles, permission scopes, and cost ownership.",
      "sections": [
        [
          "Organizational structure",
          "Management groups collect subscriptions for consistent policy and role inheritance. Subscriptions commonly form billing and quota boundaries. Resource groups organize resources managed together. A resource belongs to one resource group at a time, but it can depend on resources in other groups.",
          []
        ],
        [
          "A resource group is not a region boundary",
          "A resource group has a location for its metadata; resources within it may be in different regions. Deleting a group deletes its member resources, so use dedicated groups for labs. Keep shared DNS and essential networks separate from disposable experiments.",
          []
        ],
        [
          "Check dependencies before a move",
          "Before moving resources between groups or subscriptions, check resource-type support, dependencies, destination quotas, and provider registration. Cross-subscription moves generally require the same Entra tenant. Resource IDs can change, so review scripts and permissions. Moving a resource group does not automatically change a resource's region.",
          []
        ],
        [
          "Budgets, alerts, and Advisor",
          "Create a budget and threshold notifications for the lab subscription or group. Review costs by resource, service, and tag. Budget notifications generally do not automatically stop resources. Advisor offers optimization suggestions, but check workload and availability needs before adopting them.",
          [
            "After each lab, delete its dedicated group and check disks, IPs, retained backups, and other leftovers.",
            "Practice: explain why a VM that has been shut down can still incur costs."
          ]
        ]
      ],
      "pitfalls": [
        "A budget is not an enforced spending cap.",
        "Stopping a VM is not the same as deallocating it; deallocation does not remove disk and other charges."
      ],
      "checks": [
        "Design a suitable lab resource group and tagging structure.",
        "List five checks to perform before moving resources."
      ],
      "sourceLabels": [
        "Management groups",
        "Manage resource groups",
        "Create budgets"
      ]
    },
    "st01": {
      "title": "Storage accounts, redundancy, and encryption",
      "summary": "Choose redundancy from the required failure boundary and read-access needs.",
      "sections": [
        [
          "Accounts and services",
          "A general-purpose v2 account commonly supports Blob, Files, Queue, and Table services. Before creating one, check unique naming, region, performance, redundancy, and required protocols. Do not infer a premium account's supported services from the word Premium alone.",
          []
        ],
        [
          "LRS, ZRS, and cross-region copies",
          "LRS keeps replicas within a single datacenter boundary in the primary region. ZRS synchronously replicates across availability zones in that region. GRS adds asynchronous replication to a secondary region. GZRS combines primary-region ZRS with cross-region replication. The RA prefix enables secondary reads, not normal writes to the secondary.",
          []
        ],
        [
          "Redundancy does not replace backup",
          "Accidental deletion and bad application writes can also be replicated. Asynchronous cross-region replication means failover may lose data. Requirements such as regional disaster protection, zone-failure tolerance, and immediate secondary reads lead to different choices. Add soft delete, versioning, or independent backup as needed.",
          []
        ],
        [
          "Encryption and object replication",
          "Storage encryption at rest is enabled by default. Customer-managed keys make you responsible for key lifecycle, including Key Vault permissions and key availability. Blob object replication asynchronously copies selected block blobs; check versioning, change feed, and source/destination compatibility before configuration.",
          []
        ]
      ],
      "pitfalls": [
        "An RA-GRS secondary is a read endpoint, not a normal active-active write architecture.",
        "Object replication and account disaster recovery are different features."
      ],
      "checks": [
        "Select LRS, ZRS, GRS, or GZRS from the required failure boundary.",
        "Explain why replication still needs protection against accidental deletion."
      ],
      "sourceLabels": [
        "Storage redundancy",
        "Storage encryption",
        "Object replication"
      ]
    },
    "st02": {
      "title": "Storage authorization, SAS, and network restrictions",
      "summary": "Every request must pass both authorization and network-path checks.",
      "sections": [
        [
          "Prefer identity-based authorization",
          "For data operations that support Entra authorization, give an application's managed identity the smallest appropriate data role instead of sharing long-lived account keys. Account keys have broad access. When rotating the two keys, switch clients to the other key before regenerating the old one to avoid breaking all clients at once.",
          []
        ],
        [
          "Constrain a SAS",
          "A SAS encodes limits such as resources, permissions, and validity in a signed URL. For a partner downloading one file, use read-only access, a short lifetime, and HTTPS. User delegation SAS uses Entra credentials for issuance; service and account SAS use an account key, with different operation scopes.",
          []
        ],
        [
          "Revocation",
          "A stored access policy can be associated with a service SAS to adjust or revoke related access centrally. Account SAS and user delegation SAS do not support that association. Deleting a URL does not revoke a SAS without a policy; handle the signing key or delegation credentials according to the signature mechanism.",
          []
        ],
        [
          "Network paths",
          "A firewall restricts which network sources may use a public endpoint. A service endpoint identifies a subnet to the service but still targets its public endpoint. A private endpoint gives the service a private IP in a VNet. A SAS does not bypass network rules, and creating a private endpoint does not automatically disable public access.",
          []
        ]
      ],
      "pitfalls": [
        "Do not paste a SAS into a public repository or study notes; it is a credential.",
        "A 403 can result from authorization or network rules; repeatedly adding roles is not a diagnosis."
      ],
      "checks": [
        "Choose authorization for a short-lived file download.",
        "Check SAS permissions, validity, and network source separately."
      ],
      "sourceLabels": [
        "SAS overview",
        "Storage network security"
      ]
    },
    "st03": {
      "title": "Blob tiers, lifecycle rules, and data protection",
      "summary": "Translate access frequency, recovery latency, and retention needs into configuration.",
      "sections": [
        [
          "Hot, cool, and archive",
          "Hot, Cool, and Cold are online tiers. Archive is offline and requires rehydration before reading, so it cannot meet an immediate-download requirement. Lower storage prices commonly trade off against access charges or minimum retention periods. Identify how often data is read and how quickly it must be recovered.",
          []
        ],
        [
          "Lifecycle rules",
          "Lifecycle management moves or deletes blobs using conditions such as time and prefixes. Conditions may use last modification, last access, or creation time; these are not interchangeable. Rules execute asynchronously in the background, so crossing a day threshold does not guarantee an immediate action.",
          []
        ],
        [
          "Versions and soft delete",
          "Versioning retains earlier versions when data is overwritten. Soft delete provides a recovery window. Container soft delete and Blob soft delete protect different objects. Before restoring, identify whether the deleted object is a container, the current version, or a previous version. One protection feature does not cover every mistake.",
          []
        ],
        [
          "Immutability and business requirements",
          "Retention policies and legal holds support immutable Blob scenarios. They may prevent ordinary deletion, so understand their modes and locking behavior before experimenting. If the only goal is protection from mistakes, consider soft delete and versioning first rather than locking a long-term immutable policy.",
          []
        ]
      ],
      "pitfalls": [
        "Archive is not a cheaper online tier with immediate reads.",
        "Lifecycle rules do not automatically rehydrate Archive data into an online tier."
      ],
      "checks": [
        "Choose tiers for frequent access, infrequent access, and long-term offline retention.",
        "Demonstrate recovery after overwriting or deleting a file."
      ],
      "sourceLabels": [
        "Blob access tiers",
        "Lifecycle management",
        "Blob data protection"
      ]
    },
    "st04": {
      "title": "Azure Files, snapshots, and data migration",
      "summary": "Validate file-share authorization, protocol connectivity, and transfer tools separately.",
      "sections": [
        [
          "SMB file shares",
          "Azure Files provides managed shares. Check account, performance, and network requirements when choosing SMB or NFS. SMB commonly uses port 445; a client's local network can block the port even when credentials are correct. Check DNS and the network path before changing credentials.",
          []
        ],
        [
          "Two authorization layers",
          "SMB identity authentication can use supported options such as AD DS, Entra Domain Services, and Entra Kerberos. Share-level permissions control entry to the share, while directory/file ACLs control operations within it. A share role does not automatically grant write access to every directory.",
          []
        ],
        [
          "Snapshots and soft delete",
          "A share snapshot is a read-only point-in-time view suitable for recovering earlier file states. Share soft delete recovers a deleted share. Verify contents, paths, and permissions when restoring; a successful restore job alone is not sufficient evidence.",
          []
        ],
        [
          "AzCopy and Storage Explorer",
          "AzCopy suits efficient scripted transfers; Storage Explorer supports graphical inspection. Before copy or sync, check direction, paths, identity, and deletion behavior. Start with a small directory. For larger migrations, inspect logs, failed-item retries, and content integrity.",
          []
        ]
      ],
      "pitfalls": [
        "File-share RBAC and filesystem ACL requirements must both be satisfied.",
        "Sync deletion options can remove destination files absent from the source."
      ],
      "checks": [
        "Draw the SMB troubleshooting chain: DNS, port, authentication, authorization.",
        "Explain what share snapshots and share soft delete each restore."
      ],
      "sourceLabels": [
        "Azure Files identity authentication",
        "Share snapshots",
        "Get started with AzCopy"
      ]
    },
    "co01": {
      "title": "Virtual machines, disks, and availability",
      "summary": "Treat a VM as a combination of compute, disks, networking, and availability settings.",
      "sections": [
        [
          "Deployment and resizing",
          "Before choosing region, image, and size, check quotas, available families, and disk limits. Resizing may require a restart or deallocation; it can fail if the destination hardware does not support the configuration. Stopped and Stopped (deallocated) have different compute billing implications, while attached disks and other resources may keep accruing charges.",
          []
        ],
        [
          "Disks and encryption",
          "The OS disk stores the operating system; data disks hold persistent application data. Temporary disks must not store files that must survive. Managed disks provide encryption at rest; encryption at host and encryption inside the guest cover different layers. After expanding a disk, you generally also need to extend the partition and filesystem in the OS.",
          []
        ],
        [
          "Fault domains and availability zones",
          "An availability set spreads VMs across update and fault domains. Availability zones are separate facilities within a region. Start with the failure boundary you need to tolerate, then provide multiple instances, traffic distribution, and redundant data. Placing one VM in a zone does not automatically create a second VM.",
          []
        ],
        [
          "Scale sets and moves",
          "VM scale sets manage multiple instances and can use autoscaling. Vertical scaling changes size; horizontal scaling changes instance count. Consider thresholds, duration, cooldown, and limits. Moving a VM to another resource group differs from regional migration; check disks, NICs, and destination support.",
          []
        ]
      ],
      "pitfalls": [
        "When deleting a VM, check whether its disks and public IP are deleted too.",
        "High availability requires application-state handling as well as an availability setting."
      ],
      "checks": [
        "Explain the purposes of temporary, OS, and data disks.",
        "Choose appropriate uses for availability sets, zones, and scale sets."
      ],
      "sourceLabels": [
        "VM availability",
        "Managed disks",
        "Disk and host encryption"
      ]
    },
    "co02": {
      "title": "Repeatable deployments with ARM and Bicep",
      "summary": "Read declarative templates, preview changes, and deploy them safely.",
      "sections": [
        [
          "How to read a template",
          "Start with deployment scope, then parameters, resource types, and API versions. Follow dependencies through properties and finish with outputs. Parameters enable reuse, variables reduce repetition, and modules divide complexity. Code declares a target state; the platform schedules deployment according to dependencies.",
          []
        ],
        [
          "Bicep and ARM JSON",
          "Bicep compiles to an ARM template, and both use the same Resource Manager deployment mechanism. Symbolic references can express implicit dependencies; do not add meaningless dependsOn entries everywhere. Mark sensitive parameters as secure and do not expose passwords in outputs.",
          []
        ],
        [
          "Preview and deploy",
          "Use validate and what-if first to inspect additions, modifications, and possible deletions, then use the deployment command for the correct scope. Incremental deployment does not automatically remove an existing resource merely because it is absent from the template, but understand property update semantics when redeploying a resource.",
          []
        ],
        [
          "Export, decompile, and troubleshoot",
          "An exported ARM template can explain an existing configuration but usually needs cleanup and parameterization. Review the result of Bicep decompile manually too. For a failed deployment, read the specific operation error, then investigate permissions, policy, quotas, naming conflicts, and API properties.",
          []
        ]
      ],
      "pitfalls": [
        "What-if predicts changes; it does not guarantee quotas and dependencies will still be satisfied at deployment time.",
        "Changing parameters can cause the same template to create resources with different names."
      ],
      "checks": [
        "Explain param, resource, module, and output.",
        "Read a deployment error and identify the next diagnostic step."
      ],
      "sourceLabels": [
        "Bicep",
        "What-if",
        "Deployment modes"
      ]
    },
    "co03": {
      "title": "ACR, Container Instances, and Container Apps",
      "summary": "Separate image storage, container execution, and application scaling.",
      "sections": [
        [
          "Images and ACR",
          "A container image packages the runtime and application content. Azure Container Registry stores and distributes images. Starting a container requires image-pull authorization and a working network path. Prefer supported identity methods such as managed identity instead of embedding registry administrator passwords in templates.",
          []
        ],
        [
          "Azure Container Instances",
          "ACI runs container groups, short-lived tasks, and simple services without requiring you to manage VMs. Configure CPU, memory, ports, environment variables, restart policy, and mounted storage. Containers in a group share some networking and lifecycle characteristics. Start troubleshooting with exit codes, events, and logs.",
          []
        ],
        [
          "Azure Container Apps",
          "Container Apps provides managed application environments, revisions, and rule-based scaling. Enabling ingress still requires the correct target port. HTTP, queue, and other triggers can drive scaling; scaling to zero depends on the minimum replica count, rules, and workload requirements.",
          []
        ],
        [
          "Select and verify",
          "Evaluate ACI for a one-off batch workload. Consider Container Apps when revisions, traffic management, and event-driven scaling are needed. After deployment, check image version, health, ports, authorization, and logs. Successful resource creation alone does not prove the container process runs correctly.",
          []
        ]
      ],
      "pitfalls": [
        "ACR itself does not run your application.",
        "Public ingress cannot fix an application listening on the wrong port."
      ],
      "checks": [
        "Choose services for a simple batch job and a scalable HTTP application.",
        "Troubleshoot container failures through image pull, startup, listening, and access."
      ],
      "sourceLabels": [
        "Container Instances",
        "Container Apps",
        "ACR authentication"
      ]
    },
    "co04": {
      "title": "App Service: deployment, networking, and scaling",
      "summary": "Separate application settings from the compute plan that hosts the app.",
      "sections": [
        [
          "Apps and plans",
          "An App Service plan determines region, operating system, instance capability, and pricing tier. Apps can share a plan, so one app's load may affect others on it. Scaling up increases capability; scaling out adds instances. Feature availability depends on the pricing tier.",
          []
        ],
        [
          "Releases and deployment slots",
          "Slots provide separate application environments for validating a release before swapping with production. Mark environment-specific configuration as slot settings. A swap does not copy every resource setting, so review connection strings, identities, and dependent services before a release.",
          []
        ],
        [
          "Custom domains and TLS",
          "A custom domain needs DNS ownership verification and the correct records. HTTPS also needs a certificate and binding. Successful name resolution only proves the DNS layer works; it does not prove the certificate covers that hostname. Renewal and minimum TLS settings are ongoing operational responsibilities.",
          []
        ],
        [
          "Networking and recovery",
          "VNet integration primarily provides an outbound path from an app to VNet resources; a private endpoint provides private inbound access. Do not interchange them. For backups, check plan support, storage destination, and included app content, then restore to verify configuration and external dependencies.",
          []
        ]
      ],
      "pitfalls": [
        "Deployment slots share the App Service plan's compute resources.",
        "VNet integration does not automatically restrict a website to private inbound access."
      ],
      "checks": [
        "Explain the relationship between plan scaling and application slots.",
        "Choose the appropriate features for private inbound and VNet outbound connectivity."
      ],
      "sourceLabels": [
        "App Service plans",
        "Deployment slots",
        "Networking features"
      ]
    },
    "ne01": {
      "title": "Address planning, subnets, and public IPs",
      "summary": "Plan addresses and boundaries correctly before troubleshooting connectivity.",
      "sections": [
        [
          "CIDR and address counts",
          "A VNet has address space; its subnets must fit within that space and must not overlap. Azure reserves the first four and final IPv4 address in each subnet. A /27 contains 32 addresses, normally leaving 27 assignable. Distinguish total addresses, usable addresses, and service-specific subnet requirements.",
          []
        ],
        [
          "Address assignment",
          "A VM's private IP is managed through its NIC configuration. If it must remain fixed, configure static assignment on the Azure NIC rather than changing only the guest OS. A public IP is a separate resource; check its SKU, region, and zone characteristics against the attached service.",
          []
        ],
        [
          "Inbound and outbound",
          "Public inbound access requires a reachable entry point, routing, permitted security rules, and a listening application. Explicitly design internet outbound access using NAT Gateway, load balancer outbound rules, or another supported method. Do not rely on historical default outbound behavior; new deployments can differ from old networks.",
          []
        ],
        [
          "Planning exercise",
          "Allocate separate subnets to application, data, and management services, leaving room to grow. Avoid overlapping addresses when peering or connecting on premises. Maintain a table of subnets, route tables, NSGs, DNS settings, and expected resource counts.",
          []
        ]
      ],
      "pitfalls": [
        "VNets and subnets span availability zones within a region; you do not automatically need a subnet for each zone.",
        "A public IP does not mean a port is open."
      ],
      "checks": [
        "Calculate usable IPv4 addresses for /24, /26, and /27.",
        "Explain where a fixed private IP should be configured."
      ],
      "sourceLabels": [
        "Virtual Network",
        "Virtual Network FAQ",
        "Default outbound access"
      ]
    },
    "ne02": {
      "title": "NSGs, ASGs, and Bastion",
      "summary": "Evaluate traffic by direction, priority, and each association point.",
      "sections": [
        [
          "NSG rule evaluation",
          "NSGs match source, destination, port, protocol, direction, and priority. Lower numbers have higher priority, and evaluation stops on a match. NSGs are stateful, so return traffic for an allowed connection does not mechanically require a mirrored allow rule.",
          []
        ],
        [
          "Subnet and NIC rules combine",
          "When both a subnet and NIC have NSGs, traffic must pass both. An allow rule in one NSG cannot override a deny in the other. Inspect effective security rules and test with a new connection so an old connection's state does not mislead you.",
          []
        ],
        [
          "ASGs and service tags",
          "Application security groups organize NICs by application role and reduce maintenance of individual IPs in rules. Service tags represent service-related address sets, avoiding manual upkeep of changing addresses. Both simplify rule definitions; neither grants service authorization.",
          []
        ],
        [
          "Bastion as a management entry point",
          "Bastion provides managed VM connections without requiring a public IP on the VM for RDP or SSH. SKU, subnet, network rule, and permission requirements still apply. Check costs and deployment options before a lab and remove its resources afterwards.",
          []
        ]
      ],
      "pitfalls": [
        "Priority 100 is evaluated before 200.",
        "An existing connection may not terminate immediately after an allow rule is removed; test a new connection."
      ],
      "checks": [
        "Calculate whether traffic passes two layers of NSGs.",
        "Explain which VM-side requirements still apply when using Bastion."
      ],
      "sourceLabels": [
        "Network security groups",
        "How NSGs work",
        "Azure Bastion"
      ]
    },
    "ne03": {
      "title": "VNet peering, routing, and connectivity troubleshooting",
      "summary": "Use path evidence to locate faults instead of randomly relaxing rules.",
      "sections": [
        [
          "Peering conditions",
          "Peering connects VNets over private addresses, including across regions. Address spaces must not overlap, and both connection states need checking. Peering A with B and B with C does not automatically connect A with C; design transit and routes explicitly.",
          []
        ],
        [
          "Route selection",
          "Use the longest prefix match to identify the most specific route. For identical prefixes, the general preference is UDR, then BGP, then system routes, subject to platform-specific exceptions. Sending traffic to a virtual appliance also requires NIC IP forwarding, guest forwarding, and a correct return route.",
          []
        ],
        [
          "Gateways and transit",
          "Gateway transit in hub-and-spoke networks requires appropriate settings on both sides and supported conditions. Allow forwarded traffic does not automatically create transit routes. With a firewall or NVA, verify path symmetry so a stateful device can observe both directions.",
          []
        ],
        [
          "A consistent diagnostic sequence",
          "From source to destination, check DNS, target IP, effective routes, NSGs, appliance/guest firewalls, and application listeners. Use Network Watcher next hop, IP flow verify, and connection troubleshoot for evidence. Change one suspected cause at a time and retest.",
          []
        ]
      ],
      "pitfalls": [
        "Peering is not transitive by default.",
        "An allow-all NSG rule cannot supply a missing route."
      ],
      "checks": [
        "Explain route selection between /16 and /24 prefixes.",
        "Write an ordered diagnostic checklist for two VMs that cannot communicate."
      ],
      "sourceLabels": [
        "VNet peering",
        "Azure routing",
        "Network Watcher"
      ]
    },
    "ne04": {
      "title": "DNS, private endpoints, and load balancing",
      "summary": "Align names, addresses, service entry points, and health probes along a working path.",
      "sections": [
        [
          "Public and private DNS",
          "A public DNS zone hosts internet-resolvable records and requires correct domain delegation. A private DNS zone resolves names for linked VNets. Automatic registration and name resolution are separate link settings; creating a private zone does not make it available to every VNet.",
          []
        ],
        [
          "Private endpoints",
          "A private endpoint gives a specific service subresource a private IP. After deployment, verify that its hostname resolves to the expected address, then check approval state, networking, and data permissions. Blob and File subresources may each need their own endpoint and DNS configuration.",
          []
        ],
        [
          "Compared with service endpoints",
          "A service endpoint still uses the service's public endpoint and limits sources through subnet identity and service rules. A private endpoint maps the service entry point to a private address. When on-premises clients must access a service over a private connection, also design private DNS resolution.",
          []
        ],
        [
          "Load Balancer",
          "Azure Load Balancer distributes TCP/UDP traffic at layer 4 using a frontend, backend pool, health probes, and rules. An internal frontend uses a private address; a public frontend uses a public IP. If backends receive no traffic, check pool membership, probe port, NSGs, application listeners, and rule port mappings.",
          []
        ]
      ],
      "pitfalls": [
        "Creating a private endpoint does not automatically disable public access for every source.",
        "A running backend VM is not necessarily passing its health probe."
      ],
      "checks": [
        "Use a DNS query to prove traffic is using a private endpoint.",
        "Distinguish probe, frontend, and backend ports."
      ],
      "sourceLabels": [
        "Private DNS",
        "Private endpoints",
        "Load Balancer"
      ]
    },
    "mo01": {
      "title": "Metrics, logs, and data collection",
      "summary": "Decide which question you need to answer before deciding what to collect.",
      "sections": [
        [
          "Metrics and logs",
          "Metrics are numerical time series suited to trends such as CPU and request counts. Logs store events and detailed context for queries across sources. The Activity Log primarily records control-plane events, distinct from application logs and operating-system events.",
          []
        ],
        [
          "Diagnostic settings",
          "Configure diagnostic settings on a resource to send supported logs and metrics to destinations such as Log Analytics, Storage, or Event Hubs. Creating a workspace does not collect every resource's logs automatically; verify the actual collection settings and categories.",
          []
        ],
        [
          "AMA and DCRs",
          "Azure Monitor Agent collects configured data from within a VM. A Data Collection Rule defines sources, transformations, and destinations; an association applies the rule to a resource. Platform metrics may not need a guest agent, while guest logs require the appropriate collection path.",
          []
        ],
        [
          "Verification and cost",
          "Generate a known test event and confirm it reaches the expected table, then set retention and query permissions. If data is missing, distinguish no event generated, no collection, ingestion delay, and the wrong query time range. Collect what you need rather than ingesting large amounts of low-value data without filters.",
          []
        ]
      ],
      "pitfalls": [
        "A workspace's existence does not prove log collection is configured.",
        "The Activity Log does not replace all system events inside a VM."
      ],
      "checks": [
        "Choose data types for a CPU trend and a sign-in investigation.",
        "Describe the relationship between agent, DCR, association, and workspace."
      ],
      "sourceLabels": [
        "Azure Monitor",
        "Diagnostic settings",
        "Data Collection Rules"
      ]
    },
    "mo02": {
      "title": "KQL, alerts, and Action Groups",
      "summary": "Turn an observed anomaly into a reproducible detection and notification.",
      "sections": [
        [
          "Reading a KQL query",
          "Start with a table, use where to narrow time and conditions, project to select columns, and summarize to aggregate. For example, filter Heartbeat to the last hour and find the latest TimeGenerated for each Computer. Understand how every step changes the input and output rows.",
          []
        ],
        [
          "Time buckets and dimensions",
          "bin(TimeGenerated, 5m) groups events into five-minute buckets; summarize count() by Computer counts records per machine. If a query returns no rows, widen the time range and filters, then check table and field names. An empty result does not prove a service had no fault.",
          []
        ],
        [
          "Choose an alert type",
          "Metric alerts fit numeric thresholds, log search alerts depend on query results, and Activity Log alerts fit specific management events. Define scope, condition, evaluation frequency, window, and severity. Distinguish a sustained threshold breach from one brief spike.",
          []
        ],
        [
          "Notifications and suppression",
          "An action group defines notification recipients and automated actions. An alert processing rule can adjust alert actions, for example during maintenance. Suppressing notifications does not stop data collection. Trigger a test before rollout and verify delivery to the intended recipient.",
          []
        ]
      ],
      "pitfalls": [
        "Consider the query time range and alert evaluation window together.",
        "An action group does not automatically create a monitoring condition."
      ],
      "checks": [
        "Explain where, project, summarize, and bin.",
        "Design and test notification for a CPU threshold exceeded for five minutes."
      ],
      "sourceLabels": [
        "KQL tutorial",
        "Azure Monitor alerts",
        "Action Groups"
      ]
    },
    "mo03": {
      "title": "Insights and Network Watcher",
      "summary": "Choose the tool that answers the current operational question.",
      "sections": [
        [
          "VM and Storage Insights",
          "Insights provides resource-specific views of performance, dependencies, or service requests. Available information depends on configured monitoring. For rising storage latency, consider request type, availability, and capacity instead of only an overall average line.",
          []
        ],
        [
          "Network diagnostic tools",
          "IP flow verify evaluates whether rules allow a particular flow. Next hop explains routing decisions. Connection troubleshoot analyzes reachability. These tools answer different questions, so describe the fault in one sentence before choosing one.",
          []
        ],
        [
          "Continuous monitoring",
          "Connection Monitor continuously tracks connectivity and latency between endpoints. A successful one-time test only proves that moment, not a whole day without intermittent failures. Establish a baseline, compare trends, and check targets, protocols, and test frequency.",
          []
        ],
        [
          "Build an incident record",
          "Record time, source/destination, expected result, actual result, evidence, and fix for every fault. Avoid changing several rules at once. Retest after a change and save the useful evidence. Exam scenarios often ask for the most direct tool, and this evidence chain helps eliminate irrelevant choices.",
          []
        ]
      ],
      "pitfalls": [
        "Missing Insights charts may mean collection is not configured, not that a resource is idle.",
        "A failed ping does not directly prove an application's TCP port is unavailable."
      ],
      "checks": [
        "Choose a diagnostic tool to identify which NSG rule blocks a flow.",
        "Distinguish one-time connectivity diagnosis from continuous monitoring."
      ],
      "sourceLabels": [
        "VM Insights",
        "Storage Insights",
        "Network Watcher"
      ]
    },
    "mo04": {
      "title": "Backup, restore, and Site Recovery",
      "summary": "Accept a recovery solution only after restoration works, not merely after backup succeeds.",
      "sections": [
        [
          "Choose a vault and workload",
          "Recovery Services vaults and Backup vaults support different workloads and capabilities. Check the support matrix for the protected resource before creating one. A backup policy needs frequency, time, retention, and recovery objectives; also verify region and resource compatibility.",
          []
        ],
        [
          "Recovery points and actual restores",
          "After backup succeeds, inspect recovery points and perform the applicable file, disk, or VM restore. Restore to a new location to reduce overwrite risk, and check file contents, application startup, and permissions. Include restored VMs and disks in lab cleanup.",
          []
        ],
        [
          "Backup versus Site Recovery",
          "Backup returns data to a historical recovery point. Site Recovery focuses on replication and failover for business continuity. RPO expresses acceptable data-loss time; RTO is the target time to restore service. They solve different problems and can be combined.",
          []
        ],
        [
          "Drills, failover, and failback",
          "An ASR test failover verifies recovery on an isolated test network without disrupting production replication or live service. Failover, commit, reprotect, and failback are distinct stages. Check recovery plans, target networks, DNS, dependent services, and backup reports and alerts.",
          []
        ]
      ],
      "pitfalls": [
        "A replica or successful backup alone does not prove the business can recover.",
        "Before deleting lab resources, handle retained backups, soft delete, and vault deletion requirements."
      ],
      "checks": [
        "Explain RPO and RTO using an incident scenario.",
        "Write acceptance checks for an isolated recovery drill."
      ],
      "sourceLabels": [
        "Azure Backup",
        "Backup vaults",
        "Site Recovery"
      ]
    }
  },
  "weeks": [
    {
      "title": "Make identity and governance clear",
      "focus": "Identity & governance",
      "tasks": [
        [
          "Users, groups, and SSPR: map your identities",
          "Read the lesson and official references, then map the current tenant, users, and groups. Explain licensing versus authorization in your own words."
        ],
        [
          "RBAC: work through six permission scenarios",
          "Write six scenarios involving scope inheritance, group assignments, and management/data planes; explain the effective permissions."
        ],
        [
          "Policy, tags, and locks: build a comparison table",
          "Give two business requirements for each mechanism and explain how you would verify the implementation."
        ],
        [
          "Subscriptions and costs: establish lab conventions",
          "Review resource moves and costs; define names, tags, budgets, and a cleanup checklist for every lab."
        ],
        [
          "Lab 01: verify least privilege",
          "Complete every lab step and keep before/after authorization results. Answer ten identity questions and review your reasoning."
        ],
        [
          "Lab 02: govern resources and review the week",
          "Verify policy and lock behavior. After cleanup, spend twenty minutes explaining the three concepts you most often confuse."
        ]
      ]
    },
    {
      "title": "Keep data available, controlled, and recoverable",
      "focus": "Storage management",
      "tasks": [
        [
          "Storage redundancy: choose by failure boundary",
          "Choose redundancy for six business scenarios and state their read/write and failover limitations."
        ],
        [
          "Authorization and SAS: trace an access request",
          "Analyze failures through four checkpoints: identity, signature, time, and network."
        ],
        [
          "Blob: design lifecycle and protection policies",
          "Distinguish online tiers from Archive. Design retention, versioning, and recovery for order attachments."
        ],
        [
          "Files and migration: understand both permission layers",
          "Review SMB authentication, share permissions, ACLs, snapshots, and AzCopy."
        ],
        [
          "Lab 03: Blob authorization and deletion recovery",
          "Verify access and recovery, answer ten storage questions, and write down why your wrong answers failed."
        ],
        [
          "Lab 04: file shares, transfers, and lifecycle",
          "Complete snapshot, AzCopy, and lifecycle configuration. Revisit last week's mistakes to limit forgetting."
        ]
      ]
    },
    {
      "title": "Deploy and manage real compute resources",
      "focus": "Virtual machines & infrastructure as code",
      "tasks": [
        [
          "VMs, disks, availability zones, and scale sets",
          "Study the lesson and work through size selection, disk expansion, availability, and billing scenarios."
        ],
        [
          "Read and modify ARM / Bicep",
          "Mark parameters, dependencies, and outputs in a template; predict resource changes when parameters change."
        ],
        [
          "Containers: from an image to a running app",
          "Compare ACR, ACI, and Container Apps, then design a diagnostic sequence for startup failures."
        ],
        [
          "Lab 05: deploy VMs, disks, and Bicep",
          "Complete deployment, disk checks, and repeat deployment. Remove associated disks, IPs, and other resources."
        ],
        [
          "App Service: plans, slots, and networking",
          "Read the lesson and official documentation. Map scaling, TLS, custom domains, backup, and private access to prepare for next week's lab."
        ],
        [
          "Compute practice and spaced review",
          "Practice compute questions, then retry week-old mistakes without explanations. Record concepts you still find uncertain."
        ]
      ]
    },
    {
      "title": "Connect applications and network foundations",
      "focus": "App Service & network security",
      "tasks": [
        [
          "Lab 06: deployment slots and containers",
          "Verify App Service slots and deploy a container. Check identities, ports, logs, and cleanup."
        ],
        [
          "Addresses, subnets, and explicit outbound access",
          "Solve five subnet calculations and draw addresses and outbound connectivity for a three-tier app."
        ],
        [
          "NSGs, ASGs, and management access",
          "Use source, destination, priority, and direction to calculate whether five traffic flows pass."
        ],
        [
          "Lab 07: build a network and verify security rules",
          "Create network isolation, verify both allowed and denied flows, and retain diagnostic evidence."
        ],
        [
          "Mixed practice: identity, storage, and compute",
          "Complete a mixed practice session and use domain statistics to identify your weakest area."
        ],
        [
          "Repair weak areas and use your buffer",
          "Prioritize labs that did not meet their acceptance checks. If all pass, explain the key decisions from the four compute lessons."
        ]
      ]
    },
    {
      "title": "Troubleshoot networks with evidence",
      "focus": "Routing, DNS & load balancing",
      "tasks": [
        [
          "Peering, UDRs, and path selection",
          "Draw a hub-and-spoke network, mark routes and return paths, and explain nontransitive peering."
        ],
        [
          "DNS, endpoints, and load balancing",
          "Trace public and private requests separately; define acceptance checks for DNS, probes, and NSGs."
        ],
        [
          "Lab 08: peering, routing, and private endpoints",
          "Configure peering, routes, and a private Blob entry point. Verify DNS resolution and the access path."
        ],
        [
          "Lab 09: load balancing and health probes",
          "Check frontend, backends, rules, and probes. Keep one complete troubleshooting record."
        ],
        [
          "Networking practice",
          "Answer networking questions and explain each incorrect option. A question you cannot explain still needs review."
        ],
        [
          "A one-page networking review",
          "Without notes, draw every checkpoint from client to application. Revisit storage and compute mistakes."
        ]
      ]
    },
    {
      "title": "Detect problems and complete a real restore",
      "focus": "Monitoring & business recovery",
      "tasks": [
        [
          "Metrics, logs, AMA, and DCRs",
          "Design a VM log-collection path and explain each component's responsibility."
        ],
        [
          "KQL and alert rules",
          "Write filtering, projection, and aggregation queries yourself. Choose an alert type for each failure scenario."
        ],
        [
          "Insights and network diagnostics",
          "Match five operational questions to the tool that answers each most directly."
        ],
        [
          "Backup, ASR, RPO, and RTO",
          "Write recovery objectives and a drill checklist for a business; distinguish backup from replication."
        ],
        [
          "Lab 10: collect logs and trigger an alert",
          "Use a known event and a real notification to verify the collection and alerting path."
        ],
        [
          "Lab 11: complete a restore",
          "Verify restored contents and permissions, clean up resources, and practice monitoring questions."
        ]
      ]
    },
    {
      "title": "Combine all five domains in one project",
      "focus": "Integrated practice & gap repair",
      "tasks": [
        [
          "Lab 12: complete delivery challenge",
          "Deliver a project with permission boundaries, networking, storage, and monitoring. Try independently first, then compare with the steps. Split it into two sessions if needed."
        ],
        [
          "Explain the architecture and reproduce operations",
          "Explain the project in five minutes. Randomly select three key operations and repeat them from a blank starting point."
        ],
        [
          "First round of weak-domain repair",
          "Choose the domain with the lowest accuracy and return to the lesson and official documentation to verify your knowledge."
        ],
        [
          "Second round of mistake review",
          "Retry mistakes without looking at answers. Even after answering correctly, explain why the other options fail."
        ],
        [
          "Official assessment and gap log",
          "Open the official Practice Assessment from Resources and record topic gaps. Avoid memorizing only this site's answers."
        ],
        [
          "Finish labs, clean up, and use your buffer",
          "Fill remaining gaps, check Azure costs and leftovers, and schedule next week's timed practice when ready."
        ]
      ]
    },
    {
      "title": "Use consistent results to choose an exam date",
      "focus": "Timed practice & final review",
      "tasks": [
        [
          "Timed practice A: complete independently",
          "Answer fifty timed questions without looking anything up, then review every mistake and guess. Treat the result only as a study diagnostic."
        ],
        [
          "Repair three gaps exposed by the practice session",
          "For each gap, return to documentation or a lab and write down its trigger, decision process, and correct action."
        ],
        [
          "Timed practice B: verify again on a later day",
          "Leave at least one day between sessions, then complete another fifty-question timed practice. Focus on domain results rather than memorized answers."
        ],
        [
          "Official assessment and exam interface practice",
          "Repeat the official assessment and explore the Exam Sandbox to check cases, multiple selections, and time management."
        ],
        [
          "Check your readiness to book",
          "Aim for 80% on two consecutive fifty-question timed sessions; at least fifteen distinct questions per domain with 80% accuracy on the latest answers; and all steps and cleanup in twelve labs. Use the official assessment too before booking. Otherwise add one or two weeks."
        ],
        [
          "Light review and rest",
          "Review your own comparison tables and reasons for mistakes. Confirm exam requirements and protect sleep instead of adding lots of new material on the final day."
        ]
      ]
    }
  ],
  "resources": [
    [
      "Official AZ-104 study guide",
      "The authoritative source for exam scope and changes. Check it again before booking.",
      "Exam"
    ],
    [
      "Azure Administrator certification",
      "Find scheduling, the official practice assessment, and certification details.",
      "Exam"
    ],
    [
      "Official Practice Assessment",
      "Sign in to AI Skills Navigator for the newer official assessment and test yourself beyond this site's questions.",
      "Practice"
    ],
    [
      "Microsoft Exam Sandbox",
      "Get familiar with the exam interface and question interactions.",
      "Exam"
    ],
    [
      "MicrosoftLearning AZ-104 labs",
      "Complete official instructions to extend this site's guided labs.",
      "Hands-on"
    ],
    [
      "Official AZ-104 course",
      "Explore Microsoft Learn learning paths in more depth as needed.",
      "Courses"
    ],
    [
      "Azure CLI reference",
      "Look up command options and examples instead of memorizing syntax.",
      "Tools"
    ],
    [
      "Azure PowerShell reference",
      "Practice resource management with the Az modules.",
      "Tools"
    ],
    [
      "Azure pricing calculator",
      "Estimate regional and SKU costs before labs, then check actual charges afterwards.",
      "Tools"
    ]
  ],
  "notes": [
    "Content follows the five official exam domains. Official pages may change; recheck the guide before booking.",
    "The default plan is for learners with Azure hands-on experience and ten to twelve hours per week: eight weeks and eighty-eight hours, including labs, practice, review, and buffer time.",
    "These are original study questions, not real exam items or an official question bank. Percentage accuracy cannot be converted to a Microsoft exam score and does not guarantee a pass.",
    "This site's readiness guideline: 80% on two consecutive fifty-question timed sessions; at least fifteen distinct questions in each of the five domains with 80% accuracy on the latest answers; and every step plus resource cleanup confirmed in all twelve labs.",
    "Lessons are a review framework. Use the linked official documentation, actual Azure practice, and the official assessment alongside them."
  ]
};

export const domains = original.domains.map((item, i) => ({ ...item, name: text.domains[i][0], description: text.domains[i][1] }));
export const lessons = original.lessons.map(item => {
  const t = text.lessons[item.id];
  if (!t) throw new Error('Missing English lesson: ' + item.id);
  return { ...item, title: t.title, summary: t.summary, sections: item.sections.map((section, i) => ({ ...section, title: t.sections[i][0], body: t.sections[i][1], bullets: t.sections[i][2] })), pitfalls: t.pitfalls, checks: t.checks, sources: item.sources.map((source, i) => ({ ...source, label: t.sourceLabels[i] })) };
});
export const weeks = original.weeks.map((item, i) => ({ ...item, title: text.weeks[i].title, focus: text.weeks[i].focus, tasks: item.tasks.map((task, j) => ({ ...task, title: text.weeks[i].tasks[j][0], detail: text.weeks[i].tasks[j][1] })) }));
export const resources = original.resources.map((item, i) => ({ ...item, title: text.resources[i][0], description: text.resources[i][1], category: text.resources[i][2] }));
export const examInfo = { ...original.examInfo, notes: text.notes };

