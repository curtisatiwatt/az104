// Original Chinese study material. Official references are linked per lesson.
export const domains = [
  { id: 'identity', name: '身份与治理', english: 'Identity & governance', weight: '20–25%', color: '#7562e8', icon: 'shield', description: '理解权限边界，让资源配置、组织结构和成本保持可控。' },
  { id: 'storage', name: '存储管理', english: 'Storage', weight: '15–20%', color: '#c48a39', icon: 'database', description: '选择冗余与访问方式，保护数据并管理生命周期。' },
  { id: 'compute', name: '计算资源', english: 'Compute', weight: '20–25%', color: '#477fe0', icon: 'server', description: '部署虚拟机、容器、Web 应用，使用代码重复交付。' },
  { id: 'network', name: '虚拟网络', english: 'Networking', weight: '15–20%', color: '#319a91', icon: 'network', description: '从地址、路由、安全规则到 DNS，逐层排查连接。' },
  { id: 'monitor', name: '监控与恢复', english: 'Monitor & maintain', weight: '10–15%', color: '#d27786', icon: 'activity', description: '收集证据、触发告警，并通过恢复演练验证备份。' },
];

const ref = (label, path) => ({ label, url: path.startsWith('https:') ? path : `https://learn.microsoft.com/en-us/${path}` });
const section = (title, body, bullets = []) => ({ title, body, bullets });
const lesson = (id, domain, title, summary, sections, pitfalls, checks, sources) => ({ id, domain, title, summary, minutes: 45, sections, pitfalls, checks, sources });

export const lessons = [
  lesson('id01', 'identity', '用户、组与自助密码重置', '先分清“身份属于哪里”，再决定如何组织、授权和恢复账号。', [
    section('租户、用户与来宾', 'Microsoft Entra 租户保存身份。Azure 订阅使用租户中的身份授权资源访问。为员工创建账号与邀请合作方是两种不同操作；邀请来宾本身不会给他虚拟机或存储权限。', ['用对象 ID 识别主体，显示名称可以重复。', '排错时核对当前目录、登录账号和订阅。']),
    section('把授权对象组织成组', '为运维团队建安全组，再向组分配资源角色，能降低人员变动时的维护量。Assigned 成员由管理员维护；动态成员由属性规则决定，需核对许可要求。Microsoft 365 组面向协作场景，不能把所有组类型当成相同。'),
    section('许可与属性', '许可证决定可使用的产品功能，Azure RBAC 决定能操作哪些 Azure 资源。分配许可前核对使用位置、可用席位和服务计划；许可失败应读具体错误，再检查用户属性或冲突。部门等属性变化可能影响动态组成员。'),
    section('SSPR 的完整路径', '启用自助密码重置后，还要确保目标用户在启用范围内、已注册足够的验证方法且许可符合要求。混合身份要区分密码保存在本地还是云端；需要写回本地时还要满足 password writeback 条件。', ['练习：用测试用户注册验证方法，再走一次重置流程。', '验收：能解释“已开启 SSPR，但某用户仍不能重置”的三种原因。']),
  ], ['Entra 管理员角色和 Azure 资源角色属于不同授权体系。', '来宾身份、组成员资格、许可证都不会自动等同于资源访问权限。'], ['能区分用户、组、服务主体与托管身份。', '能列出 SSPR 的范围、注册、许可及写回检查项。'], [ref('创建和邀请用户', 'entra/fundamentals/how-to-create-delete-users'), ref('SSPR 工作原理', 'entra/identity/authentication/concept-sspr-howitworks')]),

  lesson('id02', 'identity', 'RBAC：角色、作用域与有效权限', '用“谁 + 什么权限 + 哪里”解释每一条角色分配。', [
    section('角色分配三要素', '安全主体可以是用户、组、服务主体或托管身份；角色定义列出允许执行的操作；作用域限定授权边界。给应用读一个容器的能力，应优先在该容器范围授予相应数据角色。不要先在订阅上授予 Owner 再寻找限制方法。'),
    section('继承与叠加', '作用域从管理组、订阅、资源组到资源逐层继承。普通角色分配权限是叠加的：用户在订阅有 Contributor，即使在某资源组另有 Reader，也不会因此变成只读。先画作用域树，再汇总直接和组继承的分配。'),
    section('常见角色的边界', 'Owner 可以管理资源及访问分配；Contributor 可以管理大部分资源但不能通常地管理角色分配；Reader 用于查看。User Access Administrator 等访问管理角色专门管理访问。内置角色的精确 Actions 要以角色定义为准。', ['NotActions 是从该角色允许操作中扣除，并不是全局拒绝。', 'Deny assignment 可以限制原本被允许的访问，不能把它当作普通 Reader 角色。']),
    section('管理平面和数据平面', '能在 Portal 看见存储账号不代表能读取 Blob。管理资源配置与读取对象数据需要分别判断 Actions 和 DataActions。访问失败时检查主体、租户、作用域、角色类型及传播时间；随后再检查网络限制。'),
  ], ['低层级 Reader 不会覆盖高层级 Contributor。', 'Storage Account Contributor 不等于 Storage Blob Data Contributor。'], ['能计算包含组继承的有效权限。', '能为“只读一个容器”选择最小作用域和数据角色。'], [ref('RBAC 原理', 'azure/role-based-access-control/overview'), ref('Azure 内置角色', 'azure/role-based-access-control/built-in-roles')]),

  lesson('id03', 'identity', 'Policy、标签和资源锁', '从三个角度治理：配置是否合规、如何分类、如何防止误操作。', [
    section('Policy 的工作流', '先定义规则，再把定义或 initiative 分配到作用域。题目要求“只允许特定区域”时，用策略检查资源属性。Audit 记录不合规，Deny 阻止不符合条件的请求；已有资源不一定因为新分配就被自动修改。'),
    section('修复已有资源', 'Modify 或 DeployIfNotExists 可以实现特定自动修复，但要理解评估、托管身份权限和 remediation task 三者。部署策略时看见非合规状态，不等于修复已执行。先在小范围验证规则，避免把合理资源挡住。'),
    section('标签的用途与限制', '用 Environment、Owner、CostCenter 标记资源以便查询和成本分摊。资源组标签默认不会自动复制到成员资源，需要显式配置或适用策略。标签是元数据，不能代替 RBAC，也不应存放密码和个人敏感数据。'),
    section('锁的行为', 'CanNotDelete 防止删除但允许有权限的修改；ReadOnly 会限制控制平面的更新，一些看起来像读取的操作也可能使用 POST。父作用域的锁向下继承。锁不保护数据平面的每个操作，Blob 删除仍应依赖数据保护和授权。'),
  ], ['策略分配不是角色授权；同时满足授权和策略才能成功。', 'ReadOnly 锁可能影响启动、停止、列出密钥等操作。'], ['能为区域限制、成本分类、防误删分别选择工具。', '能解释为什么锁定存储账号仍不等于保护所有 Blob。'], [ref('Azure Policy', 'azure/governance/policy/overview'), ref('资源锁', 'azure/azure-resource-manager/management/lock-resources'), ref('资源标签', 'azure/azure-resource-manager/management/tag-resources')]),

  lesson('id04', 'identity', '订阅、资源组与成本治理', '把资源生命周期、权限范围和费用责任对齐。', [
    section('组织结构', '管理组聚合多个订阅，适合统一策略与角色继承；订阅是常见的账务与限额边界；资源组用于组织一起管理的资源。一个资源在同一时刻属于一个资源组，但可以依赖其他资源组中的资源。'),
    section('资源组不是地域容器', '资源组有位置，用于保存元数据；组内资源可以位于不同区域。删除资源组会删除其成员资源，因此实验应使用专用资源组。不要把共享 DNS、关键网络与一次性实验混放。'),
    section('移动资源要核查依赖', '移动资源组或订阅前检查资源类型支持情况、依赖资源、目标订阅配额和提供程序注册。跨订阅通常要求同一 Entra 租户；资源 ID 可能改变，脚本和权限要复核。移动资源组并不会自动改变资源所在区域。'),
    section('预算、告警与 Advisor', '为实验订阅或资源组创建预算与阈值通知，并定期查看成本分析中的资源、服务和标签维度。预算通知通常不会自动停止资源。Advisor 提供可优化项，采纳前仍需确认业务负载和可用性要求。', ['每次实验结束：删除专用资源组，检查磁盘、IP、备份保留和其他残留。', '练习：解释“VM 已关机，为什么还有费用”。']),
  ], ['预算不是强制消费上限。', '停止 VM 不等于释放分配；释放 VM 也不会自动停止磁盘等费用。'], ['能设计适合实验的资源组和标签结构。', '能列出移动资源前的五项检查。'], [ref('管理组', 'azure/governance/management-groups/overview'), ref('管理资源组', 'azure/azure-resource-manager/management/manage-resource-groups-portal'), ref('创建预算', 'azure/cost-management-billing/costs/tutorial-acm-create-budgets')]),

  lesson('st01', 'storage', '存储账号、冗余与加密', '先明确故障范围和读取要求，再选择冗余方案。', [
    section('账号与服务', '常见通用 v2 账号可以承载 Blob、Files、Queue、Table 等服务。创建前确认命名唯一性、区域、性能、冗余及所需协议。某种高级性能账号支持哪些服务，不能仅根据“Premium”名称推断。'),
    section('LRS、ZRS 与跨区域', 'LRS 将副本保存在主区域内单个数据中心范围；ZRS 在主区域多个可用区同步复制。GRS 增加到次区域的异步复制；GZRS 结合主区域 ZRS 与跨区域复制。RA 前缀提供次区域读取能力，并不把次区域变为常规写入端。'),
    section('冗余不替代备份', '误删和应用写坏数据也可能复制到副本。异步跨区域复制意味着故障切换可能有数据损失。需求中的“区域灾难”“可用区故障”“立即读取次区域”分别决定选项，随后再补充软删除、版本和独立备份。'),
    section('加密与对象复制', '存储静态加密默认启用；客户管理密钥把密钥生命周期管理交给你，应考虑 Key Vault 权限与密钥可用性。Blob object replication 用于异步复制选定 block blob，配置前检查版本控制、change feed 和源/目标兼容条件。'),
  ], ['RA-GRS 的 secondary 是读取端，不能直接当作双写架构。', '对象复制与账号灾难恢复不是同一项功能。'], ['能从业务故障范围选择 LRS/ZRS/GRS/GZRS。', '能解释为什么复制仍然需要误删保护。'], [ref('存储冗余', 'azure/storage/common/storage-redundancy'), ref('存储加密', 'azure/storage/common/storage-service-encryption'), ref('对象复制', 'azure/storage/blobs/object-replication-overview')]),

  lesson('st02', 'storage', '存储授权、SAS 与网络限制', '每次访问都需要同时通过身份授权与网络路径检查。', [
    section('优先使用身份授权', '对于支持 Entra 授权的数据操作，向应用托管身份分配最小数据角色，避免长期共享账号密钥。账号密钥权限很大；轮换两把密钥时要先切换客户端，再重新生成旧密钥，以免所有客户端同时失败。'),
    section('SAS 的约束', 'SAS 将资源、权限和有效期等限制编码到签名 URL 中。给合作方下载单个文件，应限制只读、短时效和 HTTPS。User delegation SAS 使用 Entra 凭据签发；service/account SAS 使用账号密钥，适用操作范围不同。'),
    section('可撤销性', 'Stored access policy 可关联 service SAS，便于统一调整或撤销相关访问；account SAS 和 user delegation SAS 不支持这种关联。没有关联策略的 SAS 不能仅凭“删除 URL”撤销，需根据签名机制处理密钥或委派凭据。'),
    section('网络路径', 'Firewall 可以限制公开终结点允许的网络来源。Service endpoint 在服务端识别子网，但目标仍是服务公开终结点；private endpoint 给服务提供 VNet 内私有 IP。已有 SAS 不会自动绕过网络规则，私有终结点也不会自动取消公开访问。'),
  ], ['不要把 SAS 粘贴到公开仓库或学习笔记，它本身就是凭据。', '403 可能来自授权或网络规则，不能只重复增加角色。'], ['能选择适合短期下载的授权方式。', '能分别验证 SAS 权限、有效期与网络来源。'], [ref('SAS 概览', 'azure/storage/common/storage-sas-overview'), ref('存储网络安全', 'azure/storage/common/storage-network-security')]),

  lesson('st03', 'storage', 'Blob 分层、生命周期与数据保护', '把访问频率、恢复时延和保留要求转成配置。', [
    section('热、冷与归档', 'Hot、Cool、Cold 是在线层；Archive 是离线层，读取前需要 rehydrate，不能满足立即下载。降低存储单价通常意味着提高访问成本或最低保留期限要求。练题先圈出“多久读一次”和“多久必须恢复”。'),
    section('生命周期规则', '用 lifecycle management 根据时间和前缀等条件移动或删除 blob。评估条件的依据可能是最后修改时间、最后访问时间或创建时间，不能混用。规则是后台异步执行的，不保证刚跨过一天阈值就立刻生效。'),
    section('版本与软删除', '版本控制保留覆盖前的版本；soft delete 为删除提供恢复窗口；容器软删除与 blob 软删除保护对象不同。恢复前要识别被删除的是容器、当前版本还是某个旧版本。只开一种保护并不覆盖所有误操作。'),
    section('不可变性与业务要求', '保留策略和 legal hold 可用于不可变 Blob 场景。它们可能阻止正常删除，因此实验前要理解模式与锁定行为。需求如果只是防止误删，先考虑软删除和版本，不要随意锁定长期不可变策略。'),
  ], ['Archive 不是“便宜但同样能立即读取”的在线层。', '生命周期策略不负责自动把 Archive 数据恢复到在线层。'], ['能为高频、低频及长期离线资料选存储层。', '能演示覆盖或删除文件后的恢复方法。'], [ref('Blob 访问层', 'azure/storage/blobs/access-tiers-overview'), ref('生命周期管理', 'azure/storage/blobs/lifecycle-management-overview'), ref('Blob 数据保护', 'azure/storage/blobs/data-protection-overview')]),

  lesson('st04', 'storage', 'Azure Files、快照与数据迁移', '将文件共享权限、协议连通性和复制工具分开验证。', [
    section('SMB 文件共享', 'Azure Files 提供托管文件共享。选择 SMB 或 NFS 时核查账号、性能和网络要求。SMB 常涉及 445 端口，客户端本地网络阻断这个端口时，即使凭据正确也挂载失败；先确认 DNS 与网络路径。'),
    section('身份权限的两层', 'SMB 身份认证可以结合 AD DS、Entra Domain Services 或 Entra Kerberos 等受支持方案。共享级权限控制是否能进入共享，目录/文件 ACL 控制内部操作。只授予共享角色不代表所有目录都可写。'),
    section('快照与软删除', '共享快照提供某个时间点的只读视图，适合恢复文件历史状态；共享软删除用于恢复被删除的共享。执行备份与恢复练习时分别验证文件内容、路径和权限，不能仅以“恢复任务成功”验收。'),
    section('AzCopy 与 Storage Explorer', 'AzCopy 适合脚本化高效传输，Storage Explorer 适合图形化检查。执行 copy 或 sync 前核对方向、路径、身份及删除行为；先用小目录试运行。大规模迁移还要比较日志、失败重试和内容完整性。'),
  ], ['文件共享 RBAC 和文件系统 ACL 需要一起满足。', 'sync 的删除选项可能删除目标中源端不存在的文件。'], ['能画出 SMB 连接的 DNS、端口、认证、授权检查链。', '能说明快照和共享软删除各恢复什么。'], [ref('Files 身份认证', 'azure/storage/files/storage-files-active-directory-overview'), ref('共享快照', 'azure/storage/files/storage-snapshots-files'), ref('AzCopy 入门', 'azure/storage/common/storage-use-azcopy-v10')]),

  lesson('co01', 'compute', '虚拟机、磁盘与可用性', '把 VM 看成计算、磁盘、网络和可用性配置的组合。', [
    section('部署和调整大小', '选区域、镜像和大小前核查配额、可用系列与磁盘限制。调整大小可能需要重启或释放分配；目标硬件不支持原配置时会失败。Stopped 与 Stopped (deallocated) 的计算计费含义不同，磁盘等关联资源仍可能持续收费。'),
    section('磁盘与加密', 'OS disk 保存系统，data disk 保存持久业务数据；临时磁盘不能保存必须保留的文件。Azure 托管磁盘提供静态加密；encryption at host 与来宾内加密的覆盖范围不同。扩容后通常还需在操作系统内扩展分区和文件系统。'),
    section('故障域与可用区', 'Availability set 分散更新域与故障域；availability zones 是同一区域内独立设施。选择时先确认需防护的故障边界，再确保有多个实例、流量分发和数据层冗余。单独把一台 VM 放进某个可用区并不自动建立第二台。'),
    section('规模集与移动', 'VM scale sets 管理多个实例并可结合自动缩放。纵向扩展改规格，横向扩展改实例数；规则应考虑阈值、持续时间、冷却和上下限。移动 VM 到另一资源组与跨区域迁移不同，必须检查磁盘、NIC 和目标支持条件。'),
  ], ['删除 VM 时，要检查关联磁盘和公共 IP 是否一并删除。', '高可用设计不是只选一个可用性选项，还需处理应用状态。'], ['能解释临时磁盘、OS disk 和 data disk 的用途。', '能选择 availability set、zones 或 scale set 的应用场景。'], [ref('VM 可用性', 'azure/virtual-machines/availability'), ref('托管磁盘', 'azure/virtual-machines/managed-disks-overview'), ref('主机加密', 'azure/virtual-machines/disk-encryption-overview')]),

  lesson('co02', 'compute', 'ARM 与 Bicep 的可重复部署', '从读懂声明式模板，到安全地预览和执行更改。', [
    section('读模板的顺序', '先看部署作用域，再看 parameters、资源类型和 API version，然后顺着依赖关系读属性，最后看 outputs。参数用于复用，变量减少重复，模块分解复杂度。代码声明目标状态，由平台安排符合依赖的部署顺序。'),
    section('Bicep 与 ARM JSON', 'Bicep 编译为 ARM 模板，两者使用同一 Resource Manager 部署机制。通过资源符号引用可表达隐式依赖；不要为每个资源手动加无意义的 dependsOn。敏感参数应标为 secure，也不应通过 outputs 返回密码。'),
    section('预览和部署', '先 validate 与 what-if，检查资源新增、修改及可能删除，再使用正确作用域的部署命令。增量部署不会因为模板里省略某个现有资源就自动删除它，但重新部署已有资源时仍需理解属性更新语义。'),
    section('导出、转换与排错', '从已有部署导出的 ARM 模板可用于理解配置，但通常需要清理和参数化。Bicep decompile 转换后也应人工检查。失败时读部署 operation 的具体错误，从权限、策略、配额、名称冲突和 API 属性逐项定位。'),
  ], ['what-if 是变更预测，不会保证部署时配额和依赖一定满足。', '同一模板参数改变后可能创建不同名称的新资源。'], ['能说明 param、resource、module、output 的作用。', '能读懂一段部署失败信息并定位下一步。'], [ref('Bicep', 'azure/azure-resource-manager/bicep/overview'), ref('What-if', 'azure/azure-resource-manager/bicep/deploy-what-if'), ref('部署模式', 'azure/azure-resource-manager/templates/deployment-modes')]),

  lesson('co03', 'compute', 'ACR、Container Instances 与 Container Apps', '区分镜像存放、容器运行和应用缩放三个职责。', [
    section('镜像与 ACR', '容器镜像是运行环境和应用内容的打包结果；Azure Container Registry 保存和分发镜像。容器启动时需要拉取权限，网络也必须可达。优先使用托管身份等受支持方式，避免把注册表管理员密码写进模板。'),
    section('Azure Container Instances', 'ACI 适合直接运行容器组、短期任务或简单服务，无需管理 VM。配置 CPU、内存、端口、环境变量、重启策略及存储挂载。容器组内共享部分网络和生命周期；退出码、事件和日志是故障排查的起点。'),
    section('Azure Container Apps', 'Container Apps 提供托管应用环境、revision 和基于规则的缩放。启用 ingress 后仍要正确配置目标端口。HTTP、队列等触发器可以驱动缩放；是否缩到零取决于最小副本数、规则和工作负载要求。'),
    section('选择与验收', '一次性批处理可从 ACI 需求评估；需要 revision、流量和事件驱动缩放时考虑 Container Apps。部署后验证镜像版本、健康状态、端口、访问权限及日志。只看资源创建成功不能说明容器内的进程正确运行。'),
  ], ['ACR 本身不运行应用。', '设置公开 ingress 不能修复应用监听了错误端口的问题。'], ['能为简单批处理与可缩放 HTTP 应用选择服务。', '能从拉取、启动、监听、访问四步排查容器故障。'], [ref('Container Instances', 'azure/container-instances/container-instances-overview'), ref('Container Apps', 'azure/container-apps/overview'), ref('ACR 认证', 'azure/container-registry/container-registry-authentication')]),

  lesson('co04', 'compute', 'App Service：部署、网络与扩展', '把应用配置与承载应用的计算计划分开考虑。', [
    section('App 与 Plan', 'App Service plan 决定区域、操作系统、实例能力和计费层级。多个应用可以共享计划，因此一个应用的负载可能影响同一计划内其他应用。Scale up 提高规格，scale out 增加实例，功能可用性取决于定价层。'),
    section('发布与 deployment slots', '部署槽提供独立的应用环境，可先验证新版本，再与 production 交换。适合环境隔离的配置应标记 slot setting。交换不等于复制所有资源设置，正式发布前检查连接字符串、身份和依赖服务。'),
    section('自定义域和 TLS', '自定义域需要 DNS 所有权验证和正确记录；HTTPS 还需要证书与绑定。域名能解析仅证明 DNS 这一层成功，并不证明证书覆盖该主机名。续期和最低 TLS 配置属于持续运维工作。'),
    section('网络与恢复', 'VNet integration 主要用于应用访问 VNet 内资源的出站路径；private endpoint 用于私有入站访问。不要把两者互换。备份应核查计划支持、存储目标和应用内容范围，并实际恢复验证配置及外部依赖。'),
  ], ['deployment slots 共享 App Service plan 的计算资源。', 'VNet integration 不会自动让网站变成只允许私网访问。'], ['能解释计划缩放与应用部署槽的关系。', '能为私有入站和私网出站分别选择正确功能。'], [ref('App Service plans', 'azure/app-service/overview-hosting-plans'), ref('部署槽', 'azure/app-service/deploy-staging-slots'), ref('网络功能', 'azure/app-service/networking-features')]),

  lesson('ne01', 'network', '地址规划、子网与公共 IP', '先把地址和边界规划正确，再讨论连通性。', [
    section('CIDR 与地址数量', 'VNet 使用私有地址空间，子网必须位于其中且互不重叠。IPv4 子网中 Azure 保留前四个和最后一个地址；例如 /27 有 32 个总地址，通常可用 27 个。做题要区分总地址、可用地址和服务专用子网要求。'),
    section('地址分配', 'VM 的私有 IP 由 NIC 配置管理；需要固定私有地址时在 Azure NIC 设置静态分配，而不是只改操作系统。公共 IP 是独立资源，需核查 SKU、区域和区域冗余特性是否匹配所关联服务。'),
    section('入站与出站', '公开入站需要可达的入口、路由和允许的安全规则，应用也须监听。出站互联网应显式设计 NAT Gateway、负载均衡器出站或其他支持方式，不要依赖历史默认出站行为；新部署的默认值可能与旧网络不同。'),
    section('规划练习', '为应用层、数据层和管理服务分配独立子网，并给未来扩容留空间。需要 peering 或连接本地时，避免地址重叠。记录一张地址表，标出子网、路由表、NSG、DNS 和预计资源数量。'),
  ], ['VNet/子网在一个区域内跨可用区，不需为每个区机械地建一个子网。', '有公共 IP 不等于端口已开放。'], ['能计算 /24、/26、/27 的可用 IPv4 地址。', '能解释固定私有 IP 应在哪里设置。'], [ref('Virtual Network', 'azure/virtual-network/virtual-networks-overview'), ref('VNet 常见问题', 'azure/virtual-network/virtual-networks-faq'), ref('默认出站访问', 'azure/virtual-network/ip-services/default-outbound-access')]),

  lesson('ne02', 'network', 'NSG、ASG 与 Bastion', '对流量按方向、优先级和关联位置逐层判断。', [
    section('NSG 规则求值', 'NSG 使用源、目标、端口、协议、方向和优先级匹配流量。数字越小优先级越高，匹配后停止。NSG 是有状态的，已允许连接的返回流量不必机械地再建对称允许规则。'),
    section('子网和 NIC 叠加', '如果子网与 NIC 都有关联 NSG，流量必须通过两处检查。一个允许规则不能覆盖另一个 NSG 的拒绝。排错要看 effective security rules，同时确认测试的是新连接，以免旧连接状态误导判断。'),
    section('ASG 与服务标记', 'ASG 可以按应用角色组织 NIC，减少在规则里逐一写 IP 的维护成本。Service tags 代表服务相关地址集合，用于避免手动维护易变地址。它们简化规则表达，但不是服务访问授权。'),
    section('Bastion 管理入口', 'Bastion 提供到 VM 的托管管理连接，VM 不必为了 RDP/SSH 配置公共 IP。仍需满足对应 SKU、子网、网络规则与权限要求。实验先核查费用和部署方式，结束后删除相关资源。'),
  ], ['优先级 100 比 200 先匹配。', '删除允许规则后，已有连接可能不会马上断开；用新连接验证。'], ['能手算两层 NSG 下某条流量的结果。', '能说明使用 Bastion 后 VM 端仍需满足的条件。'], [ref('NSG', 'azure/virtual-network/network-security-groups-overview'), ref('NSG 工作方式', 'azure/virtual-network/network-security-group-how-it-works'), ref('Bastion', 'azure/bastion/bastion-overview')]),

  lesson('ne03', 'network', 'VNet Peering、路由与连接排错', '用路径证据定位问题，而不是随机放宽规则。', [
    section('Peering 的条件', '对等互连让不同 VNet 使用私有地址通信，可以跨区域。地址空间不能重叠，并需检查两端连接状态。A 与 B 对等、B 与 C 对等不意味着 A 自动到达 C，必须显式设计中转和路由。'),
    section('路由选择', '先按最长前缀匹配确定最具体路由；相同前缀时一般优先 UDR，再 BGP，再系统路由，同时注意平台特定路由限制。把目标发往虚拟设备后，还要确保设备开启 IP forwarding、来宾转发和正确的返回路由。'),
    section('网关与中转', 'Hub-spoke 中网关传递需要两端相应选项和支持条件。允许 forwarded traffic 不是自动创建中转路由的开关。经过防火墙或 NVA 时，要验证来回路径对称，避免有状态设备只见到单向流量。'),
    section('固定排错顺序', '从源到目标依次确认 DNS、目标 IP、有效路由、NSG、设备/来宾防火墙和应用监听。用 Network Watcher 的 next hop、IP flow verify、connection troubleshoot 获取证据，每次只改一个原因并重新验证。'),
  ], ['Peering 默认不具备传递性。', '一条允许所有流量的 NSG 规则不能补齐缺失路由。'], ['能对 /16 与 /24 的路由选择给出理由。', '能为两台 VM 不通写出有顺序的排错清单。'], [ref('VNet Peering', 'azure/virtual-network/virtual-network-peering-overview'), ref('Azure 路由', 'azure/virtual-network/virtual-networks-udr-overview'), ref('Network Watcher', 'azure/network-watcher/network-watcher-overview')]),

  lesson('ne04', 'network', 'DNS、私有终结点与负载均衡', '让名称、地址、服务入口和健康探测指向同一条可用路径。', [
    section('Public 与 Private DNS', 'Public DNS zone 托管互联网可解析记录，需要正确委派域名；Private DNS zone 供关联 VNet 内解析。VNet link 的自动注册和解析是不同选项，不能认为创建私有 zone 后所有 VNet 都能自动使用。'),
    section('Private Endpoint', 'Private endpoint 为具体服务子资源提供私有 IP。部署后验证域名解析到预期地址，再检查批准状态、网络和数据权限。Blob 与 File 等服务子资源可能需要各自终结点与 DNS 配置。'),
    section('Service Endpoint 对比', 'Service endpoint 仍访问服务的公开终结点，通过子网身份和服务端规则限制来源；private endpoint 将服务入口映射到私有地址。题目要求本地经私有连接访问服务时，需同时设计私有 DNS 解析路径。'),
    section('Load Balancer', 'Azure Load Balancer 在四层分发 TCP/UDP，配置前端、后端池、健康探测和规则。内部前端使用私有地址，公开前端使用公共 IP。后端不接流量时，依次检查池成员、探测端口、NSG、应用监听及规则端口映射。'),
  ], ['创建 private endpoint 不会自动为所有来源禁用公开访问。', '后端 VM 正在运行不代表健康探测一定成功。'], ['能用 DNS 查询证明流量使用了私有终结点。', '能区分探测端口、前端端口与后端端口。'], [ref('Private DNS', 'azure/dns/private-dns-overview'), ref('Private Endpoint', 'azure/private-link/private-endpoint-overview'), ref('Load Balancer', 'azure/load-balancer/load-balancer-overview')]),

  lesson('mo01', 'monitor', '指标、日志与数据收集', '先确定需要回答的问题，再决定采集哪些数据。', [
    section('Metrics 与 Logs', 'Metrics 是适合时间序列分析的数值，常用于快速观察 CPU、请求数等趋势；Logs 保存事件记录和详细上下文，适合跨来源查询。Activity Log 主要记录控制平面事件，与应用日志、操作系统事件不同。'),
    section('Diagnostic settings', '为资源配置 diagnostic settings，把支持的日志和指标送到 Log Analytics、存储或 Event Hub 等目标。创建 workspace 不会自动收集所有资源日志，必须核查具体资源的收集配置和类别。'),
    section('AMA 与 DCR', 'Azure Monitor Agent 在 VM 内收集受配置的数据；Data Collection Rule 定义收集来源、转换及目的地，关联让规则作用到目标资源。平台指标可能无需来宾代理，但来宾日志需要相应采集链路。'),
    section('验证与成本', '发送一条已知测试事件并确认落入预期表，再设置保留和查询权限。看不到数据时区分没有产生、没有采集、尚未到达和查询时间范围不对。按需要收集，避免无筛选地摄取大量低价值日志。'),
  ], ['workspace 存在不等于日志收集已完成。', 'Activity Log 不能替代 VM 内所有系统事件日志。'], ['能选择适合 CPU 趋势和登录事件调查的数据类型。', '能描述代理、DCR、关联、workspace 的关系。'], [ref('Azure Monitor', 'azure/azure-monitor/fundamentals/overview'), ref('Diagnostic settings', 'azure/azure-monitor/platform/diagnostic-settings'), ref('Data Collection Rules', 'azure/azure-monitor/data-collection/data-collection-rule-overview')]),

  lesson('mo02', 'monitor', 'KQL、告警与 Action Groups', '把“看见异常”变成可复现、可通知的检测。', [
    section('KQL 阅读顺序', '从表开始，用 where 缩小时间和条件，用 project 选择列，再用 summarize 聚合。示例思路：在 Heartbeat 中筛选最近一小时，按 Computer 计算最新 TimeGenerated。每一步都应理解输入与输出行数如何改变。'),
    section('时间桶和维度', 'bin(TimeGenerated, 5m) 把事件归到五分钟桶；summarize count() by Computer 计算每台机器的记录数。查询无结果时先放宽时间和过滤条件，再确认表名与字段，不能直接认定服务没有故障。'),
    section('选择告警类型', '指标告警适合数值阈值；日志查询告警依赖查询结果；Activity Log 告警适合特定管理事件。明确监视作用域、条件、评估频率、窗口和严重性，区分持续超限与单个尖峰。'),
    section('通知与抑制', 'Action group 定义通知接收方和自动化动作；alert processing rule 可以在维护窗口等范围调整告警动作。抑制通知不等于停止数据收集。上线前触发一次测试，验证是否真正送达到正确的人。'),
  ], ['查询时间范围与告警评估窗口需要一起考虑。', '创建 action group 不会自动创建监控条件。'], ['能解释 where、project、summarize、bin 的作用。', '能设计一个五分钟持续 CPU 超限的告警并验证通知。'], [ref('KQL 教程', 'azure/azure-monitor/logs/get-started-queries'), ref('Monitor 告警', 'azure/azure-monitor/alerts/alerts-overview'), ref('Action Groups', 'azure/azure-monitor/alerts/action-groups')]),

  lesson('mo03', 'monitor', 'Insights 与 Network Watcher', '从现象到证据：选择能回答当前问题的工具。', [
    section('VM 和存储 Insights', 'Insights 提供特定资源的汇总视图，帮助查看性能、依赖或服务请求。视图内容依赖已启用的监控配置。看到存储延迟上升时，要结合请求类型、可用性和容量，而不是只看单条总平均曲线。'),
    section('网络诊断工具', 'IP flow verify 帮助判断规则是否允许特定流；next hop 解释路由出口；connection troubleshoot 分析连接可达性。工具回答的问题不同，先用一句话描述故障，再挑选对应工具。'),
    section('持续监测', 'Connection Monitor 适合持续跟踪端点间连接表现与延迟。单次测试成功只证明测试时刻，不能证明整个工作日没有抖动。构建基线后比较趋势，并检查目标、协议和测试频率。'),
    section('形成排障记录', '每次故障记录时间、源/目标、预期、实际、证据和修复。不要一次改多个规则；改完重新测试并保存关键结果。考试场景常要求最直接的诊断工具，证据链也能帮助排除无关选项。'),
  ], ['Insights 图表缺失可能是收集未配置，不一定是资源没有活动。', 'ping 失败不直接证明应用 TCP 端口不可用。'], ['能为“哪条 NSG 阻止了流量”选择诊断工具。', '能区分单次连接诊断和持续连接监控。'], [ref('VM Insights', 'azure/azure-monitor/vm/vminsights-overview'), ref('Storage Insights', 'azure/storage/common/storage-insights-overview'), ref('Network Watcher', 'azure/network-watcher/network-watcher-overview')]),

  lesson('mo04', 'monitor', '备份、恢复与 Site Recovery', '以恢复成功为验收，而不止以备份任务成功为验收。', [
    section('选择 vault 和工作负载', 'Recovery Services vault 与 Backup vault 支持的工作负载和能力不同，创建前按保护对象核查支持矩阵。配置备份策略需要明确频率、时间、保留和恢复目标；vault 所在区域与资源兼容性也要核对。'),
    section('恢复点与实际恢复', '备份任务成功后检查恢复点，执行文件、磁盘或 VM 的适用恢复操作。用新位置恢复降低误覆盖风险，并验证文件内容、应用启动和访问权限。恢复后产生的 VM、磁盘等也要纳入实验清理。'),
    section('Backup 与 Site Recovery', 'Backup 用于回到历史恢复点；Site Recovery 侧重复制与故障切换以维持业务连续性。RPO 是可接受的数据损失时间，RTO 是恢复服务所需时间目标。两者解决不同问题，可以组合使用。'),
    section('演练、切换和回切', 'ASR test failover 在隔离测试网络验证恢复，不应冲击生产复制与正式业务。正式 failover、commit、reprotect 和 failback 是不同阶段。检查恢复计划、目标网络、DNS、依赖服务以及备份告警和报表。'),
  ], ['副本存在或备份成功都不能证明业务一定能恢复。', '删除实验资源前要处理保留备份、软删除和 vault 的删除条件。'], ['能用一个事故案例解释 RPO 与 RTO。', '能写出隔离恢复演练的验收清单。'], [ref('Azure Backup', 'azure/backup/backup-overview'), ref('Backup vault', 'azure/backup/backup-vault-overview'), ref('Site Recovery', 'azure/site-recovery/site-recovery-overview')]),
];

const task = (id, title, type, minutes, detail, link = {}) => ({ id, title, type, minutes, detail, ...link });
export const weeks = [
  { id: 1, title: '把权限与治理理清楚', focus: '身份与治理', hours: 11, tasks: [
    task('w1-1', '用户、组与 SSPR：整理身份地图', 'learn', 90, '读完课程与官方参考，画出当前租户、用户和组的关系。用自己的话说明许可与授权的区别。', { lessonId: 'id01', domain: 'identity' }),
    task('w1-2', 'RBAC：手算 6 个权限场景', 'learn', 90, '围绕作用域继承、组分配和管理/数据平面写出六个场景，并解释最终权限。', { lessonId: 'id02', domain: 'identity' }),
    task('w1-3', 'Policy、标签与锁：做一张对比表', 'learn', 90, '每种机制各给两个业务要求，说明实施后如何验收。', { lessonId: 'id03', domain: 'identity' }),
    task('w1-4', '订阅与成本：建立实验约定', 'learn', 90, '复习资源移动与成本，确定命名、标签、预算和每次实验的清理步骤。', { lessonId: 'id04', domain: 'identity' }),
    task('w1-5', '实验 01：验证最小权限', 'lab', 150, '完成实验全部步骤，保留授权前后结果。额外做身份领域 10 道题并复盘。', { labId: 'l01', domain: 'identity' }),
    task('w1-6', '实验 02：治理资源并完成周复盘', 'lab', 150, '验证规则和锁的行为，清理后用 20 分钟讲清最容易混淆的三个概念。', { labId: 'l02', domain: 'identity' }),
  ] },
  { id: 2, title: '让数据可用、可控、可恢复', focus: '存储管理', hours: 11, tasks: [
    task('w2-1', '存储冗余：根据故障范围做选择', 'learn', 90, '为六个业务场景选择冗余，并写明读写和故障切换限制。', { lessonId: 'st01', domain: 'storage' }),
    task('w2-2', '授权与 SAS：排查一条访问链', 'learn', 90, '用身份、签名、时间、网络四个检查点分析访问失败。', { lessonId: 'st02', domain: 'storage' }),
    task('w2-3', 'Blob：设计生命周期与保护策略', 'learn', 90, '区分在线层和归档；用订单附件场景设计保留、版本与恢复方案。', { lessonId: 'st03', domain: 'storage' }),
    task('w2-4', 'Files 与迁移：理解两层权限', 'learn', 90, '复习 SMB 认证、共享权限、ACL、快照及 AzCopy。', { lessonId: 'st04', domain: 'storage' }),
    task('w2-5', '实验 03：Blob 授权与误删恢复', 'lab', 150, '完成访问和恢复验证；练习存储题 10 道，把错误原因写到笔记。', { labId: 'l03', domain: 'storage' }),
    task('w2-6', '实验 04：文件共享、传输与生命周期', 'lab', 150, '完成共享快照、AzCopy 和生命周期配置；回顾上周错题，避免遗忘。', { labId: 'l04', domain: 'storage' }),
  ] },
  { id: 3, title: '把计算资源真正部署起来', focus: '虚拟机与基础设施代码', hours: 11, tasks: [
    task('w3-1', 'VM、磁盘、可用区与规模集', 'learn', 120, '读课程，练习大小选择、磁盘扩容、可用性及计费场景。', { lessonId: 'co01', domain: 'compute' }),
    task('w3-2', '读懂并修改 ARM / Bicep', 'learn', 90, '读模板，圈出参数、依赖和输出；预测改变参数后的资源变化。', { lessonId: 'co02', domain: 'compute' }),
    task('w3-3', '容器：从镜像到运行中的应用', 'learn', 90, '比较 ACR、ACI、Container Apps，设计容器启动失败排查顺序。', { lessonId: 'co03', domain: 'compute' }),
    task('w3-4', '实验 05：VM、磁盘与 Bicep 部署', 'lab', 150, '完成部署、磁盘验证和重复部署，清理磁盘、IP 等关联资源。', { labId: 'l05', domain: 'compute' }),
    task('w3-5', 'App Service：Plan、Slots 与网络', 'learn', 150, '读完课程及官方文档，整理缩放、TLS、自定义域、备份和私有访问的配置关系，为下周实验准备。', { lessonId: 'co04', domain: 'compute' }),
    task('w3-6', '计算专项练习与延迟复习', 'quiz', 60, '做计算领域题；一周前错题不看解析重做，记录仍不确定的概念。', { domain: 'compute' }),
  ] },
  { id: 4, title: '打通应用与网络的基础', focus: 'App Service 与网络安全', hours: 11, tasks: [
    task('w4-1', '实验 06：发布槽与容器部署', 'lab', 150, '完成 App Service 发布槽验证和容器部署，检查身份、端口、日志及资源清理。', { labId: 'l06', domain: 'compute' }),
    task('w4-2', '地址、子网与显式出站', 'learn', 90, '做五道子网计算，画出一个三层应用的地址与出口方案。', { lessonId: 'ne01', domain: 'network' }),
    task('w4-3', 'NSG、ASG 与管理入口', 'learn', 90, '对照源、目标、优先级和方向，手算五条流量是否通过。', { lessonId: 'ne02', domain: 'network' }),
    task('w4-4', '实验 07：搭建网络并验证安全规则', 'lab', 120, '建立网络隔离，分别验证允许和拒绝场景，保留排障证据。', { labId: 'l07', domain: 'network' }),
    task('w4-5', '混合练习：身份、存储、计算', 'quiz', 90, '做一次混合练习，用错题领域统计找出最弱的一项。'),
    task('w4-6', '补齐薄弱点与机动时间', 'review', 120, '优先补做未通过验收的实验；若全部完成，复述计算领域四节课的关键决策。'),
  ] },
  { id: 5, title: '建立有证据的网络排错能力', focus: '路由、DNS 与负载均衡', hours: 11, tasks: [
    task('w5-1', 'Peering、UDR 与路径选择', 'learn', 120, '画出 hub-spoke，标记路由与返回路径，解释非传递性。', { lessonId: 'ne03', domain: 'network' }),
    task('w5-2', 'DNS、终结点与负载均衡', 'learn', 90, '分别追踪公开和私有请求，写下 DNS、探测、NSG 的验收条件。', { lessonId: 'ne04', domain: 'network' }),
    task('w5-3', '实验 08：Peering、路由与私有终结点', 'lab', 150, '配置对等连接、路由和 Blob 私有入口，验证 DNS 解析及访问路径。', { labId: 'l08', domain: 'network' }),
    task('w5-4', '实验 09：负载均衡与健康探测', 'lab', 150, '核查前端、后端、规则和健康探测，保留一条完整排障记录。', { labId: 'l09', domain: 'network' }),
    task('w5-5', '网络专项练习', 'quiz', 60, '做网络题并逐条解释错误选项；无法解释的题仍视为待复习。', { domain: 'network' }),
    task('w5-6', '一页纸网络复盘', 'review', 90, '脱离笔记画出从客户端到应用的所有检查点；回顾存储与计算错题。', { domain: 'network' }),
  ] },
  { id: 6, title: '监控异常，并真的恢复一次', focus: '监控与业务恢复', hours: 11, tasks: [
    task('w6-1', '指标、日志、AMA 和 DCR', 'learn', 90, '设计一条 VM 日志采集链，说明每个组件负责什么。', { lessonId: 'mo01', domain: 'monitor' }),
    task('w6-2', 'KQL 与告警规则', 'learn', 90, '自己写筛选、投影和聚合查询；为故障场景选择告警类型。', { lessonId: 'mo02', domain: 'monitor' }),
    task('w6-3', 'Insights 与网络诊断', 'learn', 90, '把五个运维问题匹配到最直接的诊断工具。', { lessonId: 'mo03', domain: 'monitor' }),
    task('w6-4', 'Backup、ASR、RPO 和 RTO', 'learn', 90, '给业务写恢复目标与演练清单，区分备份和复制。', { lessonId: 'mo04', domain: 'monitor' }),
    task('w6-5', '实验 10：收集日志并触发告警', 'lab', 150, '通过测试事件和真实通知验收采集与告警链路。', { labId: 'l10', domain: 'monitor' }),
    task('w6-6', '实验 11：完成一次恢复', 'lab', 150, '验证恢复内容和权限；清理资源，做监控领域专项练习。', { labId: 'l11', domain: 'monitor' }),
  ] },
  { id: 7, title: '把五大领域连成一个项目', focus: '综合实战与查漏补缺', hours: 11, tasks: [
    task('w7-1', '实验 12：综合交付挑战', 'lab', 240, '完成有权限边界、网络、存储和监控的综合项目。先独立做，再对照步骤补齐，可分两次完成。', { labId: 'l12' }),
    task('w7-2', '架构讲解与操作复现', 'review', 60, '用五分钟讲解项目。随机挑三个关键操作，从空白开始复现。'),
    task('w7-3', '第一轮薄弱领域修复', 'review', 90, '根据统计选择最低正确率领域，回到课程及官方文档验证知识。'),
    task('w7-4', '第二轮错题复习', 'review', 90, '不看答案重做错题；正确后仍需解释为何其他选项不成立。'),
    task('w7-5', '官方练习评估与差距记录', 'review', 90, '从资源页进入官方 Practice Assessment，记录主题差距，避免只记本站题库答案。'),
    task('w7-6', '补实验、清理与计划缓冲', 'review', 90, '优先补缺，核对 Azure 费用和残留；达标后安排下一周模拟练习。'),
  ] },
  { id: 8, title: '用稳定表现决定考试日期', focus: '模考与最后复盘', hours: 11, tasks: [
    task('w8-1', '模拟练习 A：限时独立完成', 'quiz', 120, '不查资料完成 50 题计时模拟，再复盘全部错误与猜测。结果仅用于学习诊断。', { mode: 'exam' }),
    task('w8-2', '修复模拟暴露的三个缺口', 'review', 120, '每个缺口回到文档或实验，写下触发条件、判断方法和正确操作。'),
    task('w8-3', '模拟练习 B：隔天重新验证', 'quiz', 120, '与上次至少间隔一天，再完成 50 题计时模拟；关注领域表现，不把记住答案当成掌握。', { mode: 'exam' }),
    task('w8-4', '官方评估与考试界面练习', 'review', 120, '再次做官方评估，体验 Exam Sandbox，确认案例、多选与时间分配。'),
    task('w8-5', '报考准备检查', 'review', 90, '建议连续两次 50 题计时模考达到 80%，五个领域各练至少 15 道不同题且最近答案正确率达到 80%，12 个实验完成全部步骤与清理确认，再结合官方评估决定报考；否则延长 1–2 周。'),
    task('w8-6', '轻量回顾与休息', 'review', 90, '复习自己的对比表和错误原因，确认考试要求，保留充足睡眠，不在最后一天突击大量新内容。'),
  ] },
];

export const resources = [
  { id: 'guide', title: 'AZ-104 官方考试指南', description: '考试范围与变更的权威入口。报考前再次核对。', category: '考试', url: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104' },
  { id: 'certification', title: 'Azure Administrator 认证主页', description: '查看考试安排、官方练习评估及认证信息。', category: '考试', url: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/' },
  { id: 'practice', title: '官方 Practice Assessment', description: '登录 AI Skills Navigator 使用新版官方评估，检验本站以外的题目。', category: '练习', url: 'https://aka.ms/az104-pa' },
  { id: 'sandbox', title: 'Microsoft Exam Sandbox', description: '熟悉考试界面与题型操作。', category: '考试', url: 'https://go.microsoft.com/fwlink/?linkid=2226877' },
  { id: 'labs', title: 'MicrosoftLearning AZ-104 官方实验', description: '完整官方实验指引，可作为本站实验的延伸。', category: '实操', url: 'https://microsoftlearning.github.io/AZ-104-MicrosoftAzureAdministrator/' },
  { id: 'learn', title: 'AZ-104 官方课程', description: '按需深入 Microsoft Learn 学习路径。', category: '课程', url: 'https://learn.microsoft.com/en-us/training/courses/az-104t00' },
  { id: 'cli', title: 'Azure CLI 参考', description: '查询命令参数和示例，避免死记命令。', category: '工具', url: 'https://learn.microsoft.com/en-us/cli/azure/' },
  { id: 'powershell', title: 'Azure PowerShell 参考', description: '练习 Az 模块的资源管理操作。', category: '工具', url: 'https://learn.microsoft.com/en-us/powershell/azure/' },
  { id: 'calculator', title: 'Azure 价格计算器', description: '实验前估算区域与 SKU 成本，结束后检查账单。', category: '工具', url: 'https://azure.microsoft.com/en-us/pricing/calculator/' },
];

export const examInfo = {
  verifiedAt: '2026-11-13',
  guideUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104',
  notes: [
    '按官方五大考试领域组织内容；官方页面可能更新，报考前再次核对指南。',
    '默认计划适合已有 Azure 实操经验、每周 10–12 小时的学习者：8 周共 88 小时，包含实验、练习、复习和缓冲。',
    '本站题目为原创学习题，不是真题或官方题库。百分比正确率不能换算成 Microsoft 的考试分数，也不保证通过。',
    '本站准备度建议：连续两次 50 题计时模考达到 80%；五个领域各练至少 15 道不同题且最近答案正确率达到 80%；12 个实验完成全部步骤与资源清理确认。',
    '课程是复习框架，需结合链接中的官方文档、实际 Azure 操作与官方评估使用。',
  ],
};
