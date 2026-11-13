// Original guided exercises. The learning website never provisions Azure resources.
export const labs = [
  {
    "id": "l01",
    "domain": "identity",
    "title": "搭建最小权限的运维小组",
    "minutes": 100,
    "difficulty": "基础",
    "summary": "创建用户与安全组，在实验资源组授权，再以第二个身份验证权限边界。",
    "requirements": [
      "独立实验订阅或获准使用的实验资源组。",
      "创建用户需 User Administrator 等 Entra 权限；分配 RBAC 需目标范围内 Owner、User Access Administrator 或 RBAC Administrator。",
      "使用 Assigned 安全组，不需要 P1 动态组许可证。"
    ],
    "cost": "空资源组、Assigned 安全组不产生 Azure 资源用量费；不必开通付费许可证。",
    "steps": [
      {
        "title": "确认目录和实验范围",
        "body": "在门户确认当前目录，记下实验订阅 ID。创建空资源组 rg-az104-identity；后续角色分配都限定在该组。",
        "command": "az account show --query \"{subscription:name,id:id,tenant:tenantId}\" -o table",
        "verify": "tenantId 与 Entra 概览一致，实验资源组没有生产资源。"
      },
      {
        "title": "创建测试用户",
        "body": "Entra ID → Users → New user，创建 az104-operator，设置 Department=Lab 与正确 Usage location。安全保存初始密码，在独立浏览器会话首次登录并更改密码。",
        "verify": "测试用户能够登录；笔记不包含密码。"
      },
      {
        "title": "建立安全组",
        "body": "Groups → New group，选 Security、Assigned，命名 az104-operators。把测试用户加入 Members，管理账号设为 Owner。记录组 Object ID。",
        "verify": "组成员正确；能解释组 Owner 不等于 Azure 订阅 Owner。"
      },
      {
        "title": "验证 Reader",
        "body": "资源组 → IAM → Add role assignment，将 Reader 分配给实验安全组。等待传播后用测试用户查看资源组，再尝试修改标签。",
        "verify": "可查看而不能改标签；确认用户没有继承更高权限。"
      },
      {
        "title": "验证 Contributor",
        "body": "管理账号用 IAM → Check access 查询测试用户，记录主体、角色、范围与继承。把此组在此资源组的 Reader 替换为 Contributor，再试标签编辑和角色分配。",
        "verify": "可以编辑标签，但不能据此分配 RBAC 角色；也不会成为 Entra 用户管理员。"
      },
      {
        "title": "审计并撤销",
        "body": "查看资源组 Activity log 的 roleAssignments/write 记录。删除实验角色分配，等待传播并刷新测试用户会话。",
        "verify": "撤销后不能继续管理；能说明主体 + 角色定义 + 作用域。"
      }
    ],
    "deliverables": [
      "Reader / Contributor / Owner 权限对比表。",
      "两个预期拒绝结果及 IAM 继承说明。"
    ],
    "cleanup": [
      "删除实验角色分配。",
      "删除实验用户和安全组，确认没有其他实验依赖。",
      "删除空资源组并清除临时密码。"
    ],
    "sources": [
      {
        "label": "Microsoft 官方身份实验",
        "url": "https://microsoftlearning.github.io/AZ-104-MicrosoftAzureAdministrator/Instructions/Labs/LAB_01-Manage_Entra_ID_Identities.html"
      },
      {
        "label": "Microsoft 官方 RBAC 实验",
        "url": "https://microsoftlearning.github.io/AZ-104-MicrosoftAzureAdministrator/Instructions/Labs/LAB_02a_Manage_Subscriptions_and_RBAC_Entra.html"
      }
    ]
  },
  {
    "id": "l02",
    "domain": "identity",
    "title": "把标签、Policy、锁与预算串起来",
    "minutes": 100,
    "difficulty": "应用",
    "summary": "亲自观察部署拒绝、标签修复、删除锁与费用通知，区分四种治理机制。",
    "requirements": [
      "实验范围内可创建资源、分配 Policy、管理锁。",
      "Modify 策略的托管身份要有标签写入权限。",
      "预算需要可用的 Cost Management 范围和写权限，新订阅功能可能尚未就绪。"
    ],
    "cost": "少量存储和事务仍可能收费。预算仅通知，不会自动停止资源。",
    "steps": [
      {
        "title": "创建资源与标签",
        "body": "创建 rg-az104-governance，给组添加 Project=AZ104。创建一个不带标签的 Standard LRS 存储账户，关闭匿名 Blob 访问，名称使用全局唯一小写字母数字。",
        "verify": "账户不会自动继承资源组标签。"
      },
      {
        "title": "用 Deny 约束新部署",
        "body": "Policy → Definitions 搜索 Require a tag and its value on resources，只分配到实验资源组，参数 Project / AZ104。等待生效后尝试创建另一个缺少标签的账户；被拒后加标签重试。",
        "verify": "失败详情包含策略分配；加正确标签后验证通过。"
      },
      {
        "title": "修复已有资源",
        "body": "删除上一步实验 Deny 分配。分配 Inherit a tag from the resource group if missing，参数 Project；创建托管身份、授予所需权限并建立 Remediation task，等待结果。",
        "verify": "最初无标签的账户出现 Project=AZ104；能说明 remediation 不等于单纯合规扫描。"
      },
      {
        "title": "试用删除锁",
        "body": "给实验账户添加 CanNotDelete 锁，尝试删除并观察拒绝。之后移除这把实验锁。不把锁当成 Blob 数据防误删方案。",
        "verify": "记录删除被拒的原因；知道管理平面锁不替代数据备份。"
      },
      {
        "title": "配置预算",
        "body": "在实验资源组 Cost Management → Budgets 创建可承担的小额月预算，设 50%、80%、100% 实际成本阈值，只通知自己的邮箱。确认币种和计费范围。",
        "verify": "预算显示正确，笔记注明成本与通知可能延迟，超额不会停机。"
      },
      {
        "title": "完成治理诊断表",
        "body": "把“无角色权限”“违反策略”“删除锁阻止”“超过预算”分别映射到 IAM、Policy、Locks 和 Cost Management；记录每项首查证据。",
        "verify": "能用错误详情归因，完成清理。"
      }
    ],
    "deliverables": [
      "策略拒绝与标签修复记录。",
      "四类治理问题诊断表。",
      "预算范围、币种与阈值说明。"
    ],
    "cleanup": [
      "移除实验锁、Policy 分配与托管身份的实验角色。",
      "删除专用资源组和实验预算。",
      "待费用刷新后检查实验资源是否仍有支出。"
    ],
    "sources": [
      {
        "label": "Microsoft 官方 Policy 实验",
        "url": "https://microsoftlearning.github.io/AZ-104-MicrosoftAzureAdministrator/Instructions/Labs/LAB_02b-Manage_Governance_via_Azure_Policy.html"
      },
      {
        "label": "创建和管理预算",
        "url": "https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets"
      }
    ]
  },
  {
    "id": "l03",
    "domain": "storage",
    "title": "给 Blob 正确授权，再恢复误删文件",
    "minutes": 100,
    "difficulty": "应用",
    "summary": "区分管理与数据权限，生成临时只读 SAS，并验证版本与软删除的恢复方式。",
    "requirements": [
      "可创建 StorageV2 账户和分配 Blob 数据角色。",
      "Azure CLI/Bash，只使用没有隐私的测试文本。"
    ],
    "cost": "Standard LRS、版本和软删除保留数据及读写操作可能收费，保持 KB 级测试数据。",
    "steps": [
      {
        "title": "配置测试账户",
        "body": "创建 rg-az104-blob 和 StorageV2 账户，Standard、LRS、Hot、关闭匿名访问，不启用层次命名空间。Data protection 开启 Blob soft delete 和 versioning，记录短保留期。",
        "verify": "账户与数据保护设置明确，容器访问级别为 Private。"
      },
      {
        "title": "使用登录身份授权",
        "body": "把 Storage Blob Data Contributor 分配给自己的账号，限定到账户范围并等待传播。替换变量中的账户名，在 Bash 执行下列命令，始终使用 --auth-mode login。",
        "command": "AZ104_ACCOUNT=\"替换为实验存储账户名\"\naz storage container create --account-name \"$AZ104_ACCOUNT\" --name practice --auth-mode login",
        "verify": "创建成功；能解释 Contributor 本身不直接授予 Blob 数据权限。"
      },
      {
        "title": "上传两个版本",
        "body": "本地创建 note.txt 写入 version one，上传。再改为 version two，重复同一命令；在 Blob 的 Versions 查看历史。",
        "command": "az storage blob upload --account-name \"$AZ104_ACCOUNT\" --container-name practice --name note.txt --file ./note.txt --overwrite --auth-mode login",
        "verify": "当前内容 version two，历史版本和版本 ID 可见。"
      },
      {
        "title": "生成短期只读 SAS",
        "body": "Blob → Generate SAS，选择 User delegation key、只勾 Read、限制 HTTPS、有效期一小时。无痕窗口验证。若无法签发，检查账户级 generateUserDelegationKey 权限与传播。",
        "verify": "只可读取指定 Blob；笔记只记权限与期限，不保存 token。"
      },
      {
        "title": "删除并恢复",
        "body": "删除当前 note.txt 后查看 Versions：启用版本控制时，原当前版本成为历史版本，当前版本消失。先把目标历史版本提升/复制为当前版本并下载核对；再删除一份不需要的历史版本，在显示 deleted versions 后对 Blob 执行 Undelete，确认该版本恢复。",
        "verify": "恢复出指定版本，能区别恢复软删除对象与恢复旧版本。"
      },
      {
        "title": "说明访问三道边界",
        "body": "分别写出 RBAC、网络防火墙、SAS 到期的作用。举例说明网络可达不代表数据权限足够，数据权限正确也可能被网络规则阻止。",
        "verify": "三个判断都有清晰理由，清理时没有留下完整 SAS。"
      }
    ],
    "deliverables": [
      "两次上传与指定内容恢复记录。",
      "管理平面 / 数据平面 / 网络边界表。",
      "不含 token 的 SAS 权限和期限说明。"
    ],
    "cleanup": [
      "删除只含测试数据的专用资源组。",
      "移除不再需要的实验数据角色。",
      "清理临时 SAS、剪贴板和本地测试文件。"
    ],
    "sources": [
      {
        "label": "Blob 数据角色与权限",
        "url": "https://learn.microsoft.com/en-us/azure/storage/blobs/assign-azure-role-data-access"
      },
      {
        "label": "Blob 版本控制",
        "url": "https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview"
      },
      {
        "label": "Blob 软删除",
        "url": "https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview"
      },
      {
        "label": "SAS 权限与签名",
        "url": "https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview"
      }
    ]
  },
  {
    "id": "l04",
    "domain": "storage",
    "title": "文件共享、AzCopy 与生命周期管理",
    "minutes": 100,
    "difficulty": "应用",
    "summary": "恢复 Azure Files 快照，用 AzCopy 传输 Blob，再配置有明确范围与时间阈值的生命周期规则。",
    "requirements": [
      "可创建 Standard LRS StorageV2 账户及访问实验数据。",
      "AzCopy v10；本地可创建文件，SMB 挂载不是必需步骤。"
    ],
    "cost": "共享、快照、Blob 和事务可能收费；只用文本文件，不将短期实验数据转入 Archive。",
    "steps": [
      {
        "title": "创建文件共享",
        "body": "在 rg-az104-files 创建存储账户，File shares 新建 labshare，选小配额。通过门户上传 hello.txt，内容 original；如提示无权限，先核查当前数据访问方式，不把密钥写进笔记。",
        "verify": "共享中可见文件且能下载，记录协议与配额。"
      },
      {
        "title": "从共享快照恢复",
        "body": "创建共享快照，将当前 hello.txt 改为 changed 并上传。在 Snapshots 浏览旧快照，下载旧文件并恢复到当前共享。",
        "verify": "当前内容恢复为 original，快照不随当前文件改变。"
      },
      {
        "title": "登录 AzCopy",
        "body": "把 Storage Blob Data Contributor 分配到实验账户给自己，创建 private Blob 容器 transfer。安装官方 AzCopy v10，替换 TENANT_ID 为租户 GUID 后登录。",
        "command": "azcopy --version\nazcopy login --tenant-id \"TENANT_ID\"",
        "verify": "v10 正常，登录租户正确且权限传播完成。"
      },
      {
        "title": "复制并核对文件",
        "body": "准备 ./sample.txt，把命令 ACCOUNT 替换为账户名后复制。查看任务完成摘要，再从门户下载目标文件比较；不把 Blob OAuth 行为类推为所有 SMB 身份配置。",
        "command": "azcopy copy \"./sample.txt\" \"https://ACCOUNT.blob.core.windows.net/transfer/sample.txt\"",
        "verify": "Completed、失败数为 0，下载内容与源文件一致。"
      },
      {
        "title": "配置生命周期",
        "body": "Lifecycle management 新增规则，仅匹配 transfer/，类型 Block blobs。设当前版本最后修改 30 天后转 Cool、90 天后删除。以规则 JSON 验收，不等待 30 天；不将真实数据删除阈值改为 0。",
        "verify": "前缀包含容器名，理解规则异步运行和冷层提前删除费用。"
      },
      {
        "title": "做存储需求选型",
        "body": "给共享盘、对象归档、区域故障、误删恢复四个需求分别选择服务和数据保护。说明冗余复制为什么不能替代历史恢复点。",
        "verify": "每个选择有理由，LRS 没有被误认为跨区域保护。"
      }
    ],
    "deliverables": [
      "共享快照恢复记录。",
      "AzCopy 任务摘要和内容核对。",
      "生命周期 JSON 和需求选型表。"
    ],
    "cleanup": [
      "删除专用存储资源组及不再需要的实验角色。",
      "执行 azcopy logout，清理本地测试文件。",
      "核查快照和版本数据没有遗留。"
    ],
    "sources": [
      {
        "label": "AzCopy v10 官方文档",
        "url": "https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10"
      },
      {
        "label": "Blob 生命周期管理",
        "url": "https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview"
      },
      {
        "label": "Microsoft 官方存储实验",
        "url": "https://microsoftlearning.github.io/AZ-104-MicrosoftAzureAdministrator/Instructions/Labs/LAB_07-Manage_Azure_Storage.html"
      }
    ]
  },
  {
    "id": "l05",
    "domain": "compute",
    "title": "VM、数据磁盘与可重复部署",
    "minutes": 150,
    "difficulty": "应用",
    "summary": "创建最小实验 VM，观察磁盘与计算生命周期，再用小型 Bicep 验证声明式部署。",
    "requirements": [
      "实验 Contributor、区域 VM 配额与可用 SKU。",
      "Azure CLI、Bicep；VM agent 可用，可运行 Run command，无需公网 SSH/RDP。"
    ],
    "cost": "VM 运行、磁盘、公网 IP 可能计费；deallocate 停止计算计费但保留磁盘等费用。",
    "steps": [
      {
        "title": "创建最小 VM",
        "body": "创建 rg-az104-compute，通过门户部署区域可用的小型 Ubuntu LTS VM，先看估算费用，不开放入站管理端口。为 Run command 配置显式出站：可给 NIC 分配临时 Standard public IP 且保持全部公网入站关闭，或复用获准的出站方案。记录 region、size、zone 或无 zone，低价 SKU 不支持 zone 时记录限制。",
        "verify": "Running；能解释 zone 与 availability set 的不同故障边界。"
      },
      {
        "title": "只读检查操作系统",
        "body": "VM → Run command → RunShellScript 执行下方命令。若 agent 不正常，检查支持的代理网络连接/显式出站；不为此打开全网入站。",
        "command": "hostname\nlsblk -o NAME,SIZE,TYPE,MOUNTPOINTS\nfindmnt",
        "verify": "能识别 OS 盘和临时盘，不把临时盘用于持久数据。"
      },
      {
        "title": "添加数据磁盘",
        "body": "Disks 添加小容量 Standard SSD，保存后再次 lsblk，记录新设备、容量与 LUN。本实验只识别磁盘，不执行容易选错盘的格式化命令。",
        "verify": "Azure 磁盘与来宾新增设备对应；attach 不等于已建立可用文件系统。"
      },
      {
        "title": "准备 Bicep",
        "body": "把下方代码保存为 main.bicep，仅部署专用 NSG，以低成本观察模板；不需要导出 VM 密码。",
        "command": "param location string = resourceGroup().location\nresource nsg 'Microsoft.Network/networkSecurityGroups@2023-11-01' = {\n  name: 'nsg-az104-bicep'\n  location: location\n  tags: {\n    Project: 'AZ104'\n  }\n  properties: {\n    securityRules: []\n  }\n}\noutput nsgId string = nsg.id",
        "verify": "能够说明参数、resource、API version、properties 与 output。"
      },
      {
        "title": "预览并重复部署",
        "body": "在 Bash 登录并确认订阅后执行。部署完成再 what-if；然后只修改 Project 标签，观察差异。模板模式保留默认增量部署，不切换为 Complete。",
        "command": "az deployment group what-if --resource-group rg-az104-compute --template-file main.bicep\naz deployment group create --resource-group rg-az104-compute --template-file main.bicep\naz deployment group what-if --resource-group rg-az104-compute --template-file main.bicep",
        "verify": "首次预期创建 NSG，重复部署没有意外删除，标签变更可见。"
      },
      {
        "title": "停止、释放与伸缩",
        "body": "门户停止 VM，等待 Stopped (deallocated)，查看磁盘仍存在。查看 Resize 可用大小但无需实际升配。画一张 VMSS 多实例方案，写出健康检查、伸缩信号与状态外置需求。",
        "verify": "能区别来宾 shutdown 与 Azure deallocate，列出仍收费的资源和 VMSS 设计取舍。"
      }
    ],
    "deliverables": [
      "VM/磁盘配置表与 lsblk 输出。",
      "main.bicep、what-if 与部署记录。",
      "停止计费边界和 VMSS 简图。"
    ],
    "cleanup": [
      "删除专用资源组，检查磁盘、NIC、公网 IP 没有遗留。",
      "私钥保持私密，不提交仓库。",
      "All resources 按实验前缀复查。"
    ],
    "sources": [
      {
        "label": "Microsoft 官方 VM 实验",
        "url": "https://microsoftlearning.github.io/AZ-104-MicrosoftAzureAdministrator/Instructions/Labs/LAB_08-Manage_Virtual_Machines.html"
      },
      {
        "label": "Azure CLI 部署 Bicep",
        "url": "https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-cli"
      }
    ]
  },
  {
    "id": "l06",
    "domain": "compute",
    "title": "App Service 发布槽与一次容器部署",
    "minutes": 150,
    "difficulty": "进阶",
    "summary": "完成可回退的 Web App 发布，部署 ACI，并比较三类应用运行平台。",
    "requirements": [
      "可创建 App Service 和 ACI，区域配额足够。",
      "槽位需要 Standard、Premium 或 Isolated plan；Free/Basic 不支持。",
      "准备 release-a.zip、release-b.zip，根目录直接放 index.html，内容分别为 release-a/release-b。"
    ],
    "cost": "Standard plan 即使 Web App 停止仍计费；ACI 运行计费，连续完成后立即删除专用 plan。",
    "steps": [
      {
        "title": "建立 Windows Web App",
        "body": "在 rg-az104-web 创建 Windows App Service plan，选支持槽位的 Standard S1 或当前适合 SKU；Web App 选 .NET 运行栈，由 IIS 提供静态文件。先检查预计费用。",
        "verify": "记录 plan 地区、OS、SKU，默认 HTTPS 地址可打开。"
      },
      {
        "title": "部署生产和 staging",
        "body": "替换 APP_NAME 后向 production 部署 a 包，用 CLI 创建 staging（不要提前在门户重复创建），向 staging 部署 b 包。若租户限制此部署方式，按官方实验选受支持方式。",
        "command": "AZ104_APP=\"APP_NAME\"\naz webapp deploy --resource-group rg-az104-web --name \"$AZ104_APP\" --src-path ./release-a.zip --type zip\naz webapp deployment slot create --resource-group rg-az104-web --name \"$AZ104_APP\" --slot staging\naz webapp deploy --resource-group rg-az104-web --name \"$AZ104_APP\" --slot staging --src-path ./release-b.zip --type zip",
        "verify": "两个 host name 分别显示 a/b，staging 初始流量为 0%。"
      },
      {
        "title": "交换并回退",
        "body": "两个槽位分别加 LAB_ENV=production/staging，勾选 Deployment slot setting。记录值，在 Deployment slots 发起 Swap，审阅源目标与差异，再访问两个地址；之后再交换回退。",
        "verify": "内容互换，粘性设置留在原槽位；不把敏感配置显示到页面。"
      },
      {
        "title": "部署 ACI",
        "body": "同一实验组创建 Linux Container instance，公开示例镜像 mcr.microsoft.com/azuredocs/aci-helloworld，1 vCPU、1 GB 或向导允许最小配置，TCP 80，使用唯一 DNS label。",
        "verify": "Running，页面可访问，日志与重启计数可见。"
      },
      {
        "title": "比较运行平台",
        "body": "查看 ACI restart policy、CPU/内存。阅读 Container Apps 创建向导的 environment、revision、ingress 与 scaling，不提交额外资源。写出 App Service、ACI、Container Apps 与 ACR 的关系。",
        "verify": "对比表包含版本发布、伸缩、镜像来源和适用场景。"
      },
      {
        "title": "检查网络与伸缩",
        "body": "查看 App Service HTTPS Only、TLS、Custom domains、Networking、Scale up/out。说明域名验证、升 SKU 与加实例的区别；不必购买域名或证书。",
        "verify": "理解 VNet integration 主要解决出站、private endpoint 解决私有入站，完成清理。"
      }
    ],
    "deliverables": [
      "交换、回退与粘性配置记录。",
      "ACI Running 与页面验证。",
      "应用平台选型表。"
    ],
    "cleanup": [
      "删除 rg-az104-web，确认 plan、槽位、ACI 都已删除。",
      "检查独立日志资源或误建 plan 没有遗留。",
      "只保留不含秘密的 ZIP 和笔记。"
    ],
    "sources": [
      {
        "label": "App Service 部署槽位",
        "url": "https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots"
      },
      {
        "label": "Microsoft 官方 Web Apps 实验",
        "url": "https://microsoftlearning.github.io/AZ-104-MicrosoftAzureAdministrator/Instructions/Labs/LAB_09a-Implement_Web_Apps.html"
      },
      {
        "label": "Microsoft 官方 ACI 实验",
        "url": "https://microsoftlearning.github.io/AZ-104-MicrosoftAzureAdministrator/Instructions/Labs/LAB_09b-Implement_Azure_Container_Instances.html"
      }
    ]
  },
  {
    "id": "l07",
    "domain": "network",
    "title": "从 IP 规划到 NSG 规则验证",
    "minutes": 120,
    "difficulty": "应用",
    "summary": "建立两层子网和安全规则，用有效规则与 IP flow verify 解释允许与拒绝。",
    "requirements": [
      "网络资源写权限，运行中的小型实验 VM，Network Watcher。",
      "地址段不与已有网络重叠，示例不能直接套进公司网络。"
    ],
    "cost": "VNet/NSG 本身通常不按小时收费，VM、日志和额外诊断可能收费。",
    "steps": [
      {
        "title": "规划地址",
        "body": "规划 VNet 10.104.0.0/16，web 子网 10.104.1.0/24，data 子网 10.104.2.0/24。在专用资源组创建这些资源；计算每个 /24 总地址与保留地址。",
        "verify": "地址不重叠，/24 共 256 个，Azure 保留 5 个，可分配 251。"
      },
      {
        "title": "关联子网 NSG",
        "body": "给 data 子网关联 NSG。入站 priority 200 允许来源 10.104.1.0/24 到 10.104.2.0/24 的 TCP 5432；priority 300 拒绝来源 VirtualNetwork、目标 Any、任意端口。",
        "verify": "方向、地址、端口正确，定制规则在默认 AllowVNetInBound 之前。"
      },
      {
        "title": "放置验证 VM",
        "body": "data 子网部署小型 Ubuntu VM，不开公网入站。为代理/Run command 配置显式出站，可给 NIC 临时 Standard public IP 或复用获准方案。为了隔离变量，NIC 不额外关联 NSG；若门户已创建，先理解其影响再调整本实验资源。确认 agent 与 Network Watcher 可用。",
        "verify": "NIC 子网正确，Effective security rules 显示预期 NSG。"
      },
      {
        "title": "验证允许规则",
        "body": "Network Watcher → IP flow verify，选择 VM、Inbound、TCP，本地 IP 为该 VM 私网地址、本地端口 5432；远端 IP 10.104.1.10、远端端口 50000。这是规则检查，远端地址无需真的有 VM。",
        "verify": "Allow，匹配自定义规则；这不能证明 VM 上真的有数据库服务。"
      },
      {
        "title": "制造优先级冲突",
        "body": "先把本地端口改为 22 观察 Deny。再加 priority 100 的临时 Deny TCP 5432，重测原流量；移除故障规则后再测。每次使用新的测试，不拿现有连接结果推断规则已生效。",
        "verify": "原流量 Allow → Deny → Allow，较小优先级数值先匹配。"
      },
      {
        "title": "区分网络与服务",
        "body": "VM Run command 执行 ss -lnt，看是否有进程监听 5432。写出 NSG 允许但无监听、服务运行但 NSG 拒绝两种路径；再画 ASG 替代 IP 前缀的方案。",
        "command": "ss -lnt",
        "verify": "按路由、NSG、OS 防火墙、监听进程分层排查，未采用 Any/Any 放通。"
      }
    ],
    "deliverables": [
      "地址计算表。",
      "三次 IP flow verify 和命中规则。",
      "子网与 NIC NSG 的路径图。"
    ],
    "cleanup": [
      "删除实验 VM、磁盘、NIC 和专用网络资源组。",
      "共享 Network Watcher 不删除，仅清理本实验诊断。",
      "检查未遗留公网 IP 或开放的管理端口。"
    ],
    "sources": [
      {
        "label": "NSG 规则与状态行为",
        "url": "https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview"
      },
      {
        "label": "Microsoft 官方网络实验",
        "url": "https://microsoftlearning.github.io/AZ-104-MicrosoftAzureAdministrator/Instructions/Labs/LAB_04-Implement_Virtual_Networking.html"
      }
    ]
  },
  {
    "id": "l08",
    "domain": "network",
    "title": "Peering、路由与 Blob 私有终结点",
    "minutes": 150,
    "difficulty": "进阶",
    "summary": "连接两个 VNet，检查 DNS 到私网 IP 的解析，并验证公网开关与数据授权的独立作用。",
    "requirements": [
      "可管理两端 VNet、peering、private endpoint、Private DNS 和存储。",
      "测试 VM 可用 Run command；使用不重叠网络。"
    ],
    "cost": "Private endpoint 按小时/流量收费；VM、DNS、peering 流量可能计费，建议当天清理。",
    "steps": [
      {
        "title": "建立网络与客户端",
        "body": "rg-az104-private 创建 client VNet 10.108.0.0/16、service VNet 10.109.0.0/16，各建 /24 子网。客户端放小型 VM，不开公网入站；可给 NIC 临时 Standard public IP 或复用获准出站，使 Run command 可回传结果。公网 IP 不会改变后续 Blob 私网 DNS 解析。",
        "verify": "记录两端 VNet ID 和 VM 私网 IP，地址不重叠。"
      },
      {
        "title": "双向 peering",
        "body": "建立 client→service 与 service→client peering，允许 VNet access。查看状态和客户端 VM Effective routes。",
        "verify": "两端 Connected，有远端 peering 路由；A-B/B-C 不自动允许 A-C。"
      },
      {
        "title": "创建 Blob endpoint",
        "body": "创建 Standard LRS StorageV2 账户，Networking → Private endpoint connections 添加 endpoint，子资源选 blob，放 service 子网。启用 DNS 集成，创建 privatelink.blob.core.windows.net。",
        "verify": "连接 Approved，记录 endpoint NIC 的私网 IP；file 子资源需单独 endpoint。"
      },
      {
        "title": "关联客户端 DNS",
        "body": "把 Private DNS zone 同时 link 到 client VNet，通常不开自动注册。VM Run command 查询正常服务域名，替换 ACCOUNT。不要把程序连接串硬改成私网 IP。",
        "command": "getent ahostsv4 ACCOUNT.blob.core.windows.net",
        "verify": "返回 endpoint 的 10.109.x.x 地址；公网结果优先查 DNS link/转发。"
      },
      {
        "title": "区分连接与数据授权",
        "body": "在 VM 发起 HTTPS 请求。匿名请求的 400/403 可能说明服务有响应，却不能证明数据权限。若要读取文件，给测试身份 Blob Data Reader，在网络可达客户端使用登录身份访问。",
        "command": "curl -I --connect-timeout 10 https://ACCOUNT.blob.core.windows.net/",
        "verify": "分别记录 DNS、TCP/TLS、HTTP 状态和数据读取结果，不把所有 403 当成网络失败。"
      },
      {
        "title": "禁用公网入口",
        "body": "账户 Public network access 设为 Disabled。再次从 VM 检查私网路径，从未连接 VPN 的个人电脑检查公网不可读取。同一数据身份也不能绕过网络规则。",
        "verify": "private endpoint 创建本身不关闭公网；私网路径仍需数据授权。"
      },
      {
        "title": "理解路由关联",
        "body": "查看有效路由的本地、peering 与默认项。创建不关联子网的 route table，添加 10.200.0.0/16 → None；说明它只有关联后才影响流量，不添加默认路由黑洞。",
        "verify": "能说明最长前缀匹配、路由下一跳、route table 关联。"
      }
    ],
    "deliverables": [
      "peering Connected 与有效路由。",
      "DNS 私网解析证据。",
      "私网/公网/RBAC 验证矩阵。"
    ],
    "cleanup": [
      "删除客户端 VM、private endpoint 和专用资源组。",
      "检查 DNS zone、links、route table、磁盘无遗留。",
      "不删除其他网络共用的 DNS zone。"
    ],
    "sources": [
      {
        "label": "Storage 私有终结点",
        "url": "https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints"
      },
      {
        "label": "Microsoft 官方网络互联实验",
        "url": "https://microsoftlearning.github.io/AZ-104-MicrosoftAzureAdministrator/Instructions/Labs/LAB_05-Implement_Intersite_Connectivity.html"
      }
    ]
  },
  {
    "id": "l09",
    "domain": "network",
    "title": "让负载均衡健康检查真正工作",
    "minutes": 150,
    "difficulty": "进阶",
    "summary": "把两个后端放到 Standard LB 后面，制造并区分应用、探针和 NSG 故障。",
    "requirements": [
      "可创建 Standard LB、Standard public IP 和两台小型 Ubuntu VM。",
      "VM 要有显式出站供代理与安装包使用：可各配临时 Standard public IP 并关闭公网管理入站，或使用已有获准出站方案。"
    ],
    "cost": "两台 VM、磁盘、LB、公网 IP 都计费，安排连续时段并立刻清理。",
    "steps": [
      {
        "title": "搭建前后端",
        "body": "rg-az104-lb 建 VNet、backend 子网和 web-a/web-b。创建 Standard 公网 LB 及 Standard 静态公网 IP，把两个 VM NIC 的 IP configuration 加入 backend pool。",
        "verify": "前端和后端池存在；不用已退役的 Basic SKU。"
      },
      {
        "title": "运行 HTTP 服务",
        "body": "两台 VM 用 Run command 安装 nginx，把 hostname 写到首页。前提是显式出站已验证；apt 失败应检查网络而不是反复重装。",
        "command": "apt-get update && apt-get install -y nginx\nhostname > /var/www/html/index.html\nsystemctl enable --now nginx\ncurl --fail http://127.0.0.1/",
        "verify": "两个后端本地分别返回 web-a 与 web-b。"
      },
      {
        "title": "允许客户端和探针",
        "body": "后端 NSG 仅允许自己的当前公网 IP/32 到 TCP 80。保留/添加 AzureLoadBalancer service tag 探针允许，确认没有更高优先级拒绝；同时检查 NIC 与子网 NSG。",
        "verify": "有效规则允许客户 HTTP 和 probe，SSH/RDP 没有全网开放。"
      },
      {
        "title": "连接 rule 与 probe",
        "body": "创建 HTTP probe，port 80、path /。创建 TCP 80→80 的 rule，绑定前端、backend pool 与 probe。等待后端健康，从个人电脑访问 LB IP。",
        "verify": "页面可访问，健康指标正常；分流基于连接，不保证每次请求轮流。"
      },
      {
        "title": "停止一个后端",
        "body": "在 web-a 执行 systemctl stop nginx，等待探针判断，再用新连接访问前端。之后执行 systemctl start nginx，观察恢复。",
        "command": "systemctl stop nginx\n# 观察故障后再单独运行：\n# systemctl start nginx",
        "verify": "故障后端不接收新流量，另一后端继续响应；恢复后健康。"
      },
      {
        "title": "故障分层诊断",
        "body": "用 Network Watcher Connection troubleshoot/IP flow verify 检查到 TCP 80 的路径。把 probe 改为 /not-found 观察非 200 导致异常，再恢复 /。",
        "verify": "能区分 probe 配置错误、NSG 拒绝和应用未监听。"
      },
      {
        "title": "解释入口与出口",
        "body": "画前端 IP、backend 私网 IP、probe 和 rule；解释 Layer 4 不按 URL 路径路由，入站 LB 不等于已经配置应用所需的出站。",
        "verify": "图中明确本实验显式出站方式，完成清理。"
      }
    ],
    "deliverables": [
      "双后端独立页面和健康指标。",
      "nginx 故障与 probe 路径故障证据链。",
      "入口/出口流量图。"
    ],
    "cleanup": [
      "删除专用资源组及全部 VM、磁盘、LB、Standard public IP。",
      "清理独立创建的诊断/日志资源。",
      "确认费用页没有新的持续资源用量。"
    ],
    "sources": [
      {
        "label": "Azure Load Balancer 概述与 SKU",
        "url": "https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-overview"
      },
      {
        "label": "Microsoft 官方流量管理实验",
        "url": "https://microsoftlearning.github.io/AZ-104-MicrosoftAzureAdministrator/Instructions/Labs/LAB_06-Implement_Network_Traffic_Management.html"
      }
    ]
  },
  {
    "id": "l10",
    "domain": "monitor",
    "title": "从活动日志到 KQL，再到告警通知",
    "minutes": 120,
    "difficulty": "应用",
    "summary": "建立可验证的监控链：管理操作、日志采集、KQL、真实告警与通知。",
    "requirements": [
      "可创建 Log Analytics、诊断设置、告警规则和 Action group。",
      "订阅 Activity log 导出需订阅级相应权限；测试只通知自己的邮箱。"
    ],
    "cost": "日志摄取/保留、部分告警通知可能收费；仅采集实验所需类别并及时关闭。",
    "steps": [
      {
        "title": "建立工作区",
        "body": "rg-az104-monitor 创建 Log Analytics workspace，查看区域、保留天数、Usage and estimated costs。使用适合练习的保留设置，不导入所有生产日志。",
        "verify": "可以进入 Logs，知道 workspace 是存储和查询范围。"
      },
      {
        "title": "导出管理事件",
        "body": "实验订阅 Activity log → Export Activity Logs / Diagnostic settings，创建本实验设置，只把 Administrative 类别发送到刚建工作区。权限不足应由实验订阅管理员执行。",
        "verify": "目标 workspace 正确；Activity log 与资源诊断日志是不同来源。"
      },
      {
        "title": "产生并查询事件",
        "body": "给实验资源组改标签 LabRun=monitor-test，记时间。先在门户 Activity log 找到事件，再等待导出摄取，用下方 KQL。首次摄取可能延迟，零行不立即意味着配置失败。",
        "command": "AzureActivity\n| where TimeGenerated > ago(2h)\n| where ResourceGroup =~ \"rg-az104-monitor\"\n| project TimeGenerated, OperationNameValue, ActivityStatusValue, Caller\n| order by TimeGenerated desc",
        "verify": "找到了本次操作；若表不存在，检查导出目标、时间与摄取等待。"
      },
      {
        "title": "聚合日志",
        "body": "运行汇总查询，再试过滤 ActivityStatusValue == \"Failure\"。没有失败可以零行，无需对生产资源制造故障。",
        "command": "AzureActivity\n| where TimeGenerated > ago(24h)\n| summarize Events=count() by OperationNameValue, ActivityStatusValue\n| order by Events desc",
        "verify": "理解 where、project、summarize、count、时间窗口。"
      },
      {
        "title": "测试通知通道",
        "body": "创建 ag-az104，仅配置自己的邮箱。使用 Test action group，检查收件箱和垃圾箱，记录延迟。",
        "verify": "收到测试通知；知道它还不能证明真实规则会触发。"
      },
      {
        "title": "触发真实告警",
        "body": "在刚才 Activity log 事件选择 Create alert rule，scope 限定实验资源组，选择相应写操作、Succeeded 状态，关联 ag-az104。再改一次标签，到 Monitor → Alerts 查触发实例。",
        "verify": "真实告警与事件目标和时间对应，收到实际通知。"
      },
      {
        "title": "区分指标与来宾日志",
        "body": "查看一个实验资源 Metrics。记录平台指标、Activity log、VM 来宾日志的不同来源。后者需要 Azure Monitor Agent 与 DCR 等采集配置，不能只创建工作区就假定已采集。",
        "verify": "三类场景选对数据来源，关闭实验采集后清理。"
      }
    ],
    "deliverables": [
      "两条可执行 KQL 与结果摘要。",
      "测试通知和真实告警各一次。",
      "三种监控数据来源表。"
    ],
    "cleanup": [
      "先删订阅级实验诊断导出，防止继续写入。",
      "删告警、Action group、专用 workspace 和资源组。",
      "若加过 AMA/DCR，仅移除实验配置。"
    ],
    "sources": [
      {
        "label": "创建 Activity log 告警",
        "url": "https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-create-activity-log-alert-rule"
      },
      {
        "label": "Microsoft 官方监控实验",
        "url": "https://microsoftlearning.github.io/AZ-104-MicrosoftAzureAdministrator/Instructions/Labs/LAB_11-Implement_Monitoring.html"
      }
    ]
  },
  {
    "id": "l11",
    "domain": "monitor",
    "title": "真正恢复一次备份，并设计灾备演练",
    "minutes": 150,
    "difficulty": "进阶",
    "summary": "建立 VM 恢复点并实际还原磁盘、验证文件，再设计隔离的 Site Recovery 测试。",
    "requirements": [
      "只保护专用实验 VM；可管理 Recovery Services vault 与 VM Backup。",
      "准备同区域隔离还原资源组及向导要求的 staging storage，作业可能超过学习时段。",
      "先查看 soft delete、保留和 immutability；不要为短期实验锁定不可逆 immutable vault。"
    ],
    "cost": "受保护实例、备份数据、还原磁盘/VM 可能收费；软删除保留可能使清理无法立即完成。ASR 此处默认仅设计。",
    "steps": [
      {
        "title": "写入识别数据",
        "body": "在专用实验 VM OS 盘建立测试文件，记录 VM 区域、磁盘类型、加密与 agent 状态，不选择业务 VM。",
        "command": "printf \"AZ104 restore checkpoint\\n\" > /var/tmp/az104-restore.txt\ncat /var/tmp/az104-restore.txt",
        "verify": "保存内容和路径，可据此识别恢复点。"
      },
      {
        "title": "配置同区域备份",
        "body": "创建与 VM 同区域的 Recovery Services vault，保护前检查冗余、soft delete、immutability。启用 VM backup，选择明确的每日时间/时区与短保留策略，记下保留截止日期。",
        "verify": "VM 出现在 Backup items，能说明 Backup vault 与 Recovery Services vault 不可随意互换。"
      },
      {
        "title": "生成恢复点",
        "body": "执行 Backup now，等待 Backup jobs Completed，记录恢复点时间与一致性类型。等待时可学习其他内容，未成功前不能勾选这步。",
        "verify": "实际恢复点存在，而非仅已配置策略。"
      },
      {
        "title": "还原到隔离资源组",
        "body": "选恢复点 → Restore VM → Restore disks，目标新建 rg-az104-restore，按向导配 staging storage。不选覆盖现有磁盘；等待作业完成，检查新磁盘和部署模板。",
        "verify": "恢复 Completed，新磁盘在隔离范围，记录耗时与资源数。"
      },
      {
        "title": "核对恢复数据",
        "body": "使用生成模板或恢复向导从还原 OS 盘建立临时 VM，名称、IP 不与原资源冲突。Run command 读取测试文件；只有看到预期内容才认定恢复有效。",
        "command": "cat /var/tmp/az104-restore.txt",
        "verify": "内容与原始标识一致；记录完整耗时，解释 RPO 与 RTO。"
      },
      {
        "title": "设计 ASR 测试",
        "body": "阅读官方 Azure-to-Azure 教程，画源 VM、cache storage、目标复制磁盘、vault 与隔离测试 VNet。写明 test failover、应用验证、cleanup test failover、正式切换与回切顺序。本步仅设计，实际启动复制要另核费用配额。",
        "verify": "区分备份历史恢复与 ASR 连续性；方案包含复制健康、RPO 和测试隔离。"
      },
      {
        "title": "处理清理依赖",
        "body": "删除恢复 VM/磁盘，对仅含实验数据的 Backup item 停止保护并按选定保留流程处理数据。检查 soft deleted items、锁与其他依赖；删除源 VM 不等于备份费用已停止。",
        "verify": "若 vault 不能立即删，记录依赖、到期日和待办，清理不勾成已完成。"
      }
    ],
    "deliverables": [
      "备份成功、恢复成功、文件核对三份证据。",
      "恢复耗时和 RPO/RTO 说明。",
      "ASR 隔离测试图、清理依赖表。"
    ],
    "cleanup": [
      "删除还原 VM、磁盘、NIC、staging storage 和资源组。",
      "停止实验备份，按保留/软删除处理数据，等待期保留待办。",
      "无保护项、软删除项和依赖后删除专用 vault；不修改生产 vault 安全设置。",
      "如自行实施 ASR，另停复制并清缓存、目标磁盘和测试资源。"
    ],
    "sources": [
      {
        "label": "Microsoft 官方数据保护实验",
        "url": "https://microsoftlearning.github.io/AZ-104-MicrosoftAzureAdministrator/Instructions/Labs/LAB_10-Implement_Data_Protection.html"
      },
      {
        "label": "Azure-to-Azure Site Recovery",
        "url": "https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-tutorial-enable-replication"
      },
      {
        "label": "删除 vault 的依赖条件",
        "url": "https://learn.microsoft.com/en-us/azure/backup/backup-azure-delete-vault"
      }
    ]
  },
  {
    "id": "l12",
    "domain": "compute",
    "title": "综合项目：交付可管理的 Azure 环境",
    "minutes": 240,
    "difficulty": "综合",
    "summary": "从需求到验收完成一次小型交付。核心项目必须实际验证，高费用灾备可明确作为设计交付。",
    "requirements": [
      "已完成身份、存储、计算、网络和监控基础实验。",
      "独立资源组与权限，先确定本次费用上限和清理时间。",
      "交付笔记禁止包含密码、密钥、SAS 和真实用户数据。"
    ],
    "cost": "核心包含小型 VM、存储和监控；private endpoint、LB、ASR 为有预算才实施的扩展。预算通知不会限制支出。",
    "steps": [
      {
        "title": "写可测试的需求",
        "body": "场景：小团队保存项目文件，运维人员管理一台 Linux 工具 VM。要求最小权限、Project 标签、文件可恢复、操作可审计、当天清理。列资源、权限、地址、恢复方法与费用。",
        "verify": "每条需求对应可观察结果，不只写“配置完成”。"
      },
      {
        "title": "模板部署网络",
        "body": "以 l05 Bicep 为基础添加 VNet、子网和 NSG，地址不重叠。what-if 审阅后部署到 rg-az104-capstone，支持标签的资源加 Project=AZ104、Environment=Lab。",
        "verify": "模板可重复部署，没有意外删除，标签齐全。"
      },
      {
        "title": "验证最小权限",
        "body": "为观察角色设 Reader，文件操作身份设限定在实验存储范围的 Blob Data Contributor。用 IAM Check access 看继承，再分别测试资源管理与数据访问。",
        "verify": "至少一个应该成功和一个应该失败的操作有实际证据。"
      },
      {
        "title": "部署并恢复数据",
        "body": "部署小型 Ubuntu VM，不开放公网管理端口并确保 agent 连接。创建 private Blob 容器、测试文件、版本/软删除，覆写后从历史版本恢复；VM Run command 查看磁盘网络。",
        "verify": "VM 正常、文件恢复正确，临时盘未作为持久数据盘。"
      },
      {
        "title": "接通监控",
        "body": "按 l10 做最少量日志采集，KQL 查本次管理操作，限定实验范围建立告警与自己的 Action group。触发一次事件并记录从操作到通知延迟。",
        "verify": "查询结果、告警实例与通知按时间对应。"
      },
      {
        "title": "处理三种故障",
        "body": "依次撤销测试数据角色观察授权失败；加高优先级 NSG Deny 用 IP flow verify 定位；删除 Blob 后恢复。每次记录症状、假设、证据、修复、复测，结束后恢复配置。",
        "verify": "三个 incident 都有证据链，每次只改变一个变量。"
      },
      {
        "title": "准备交接说明",
        "body": "整理架构图、权限范围、成本、恢复步骤、KQL 和模板。用 5 分钟解释区域故障、预算超额、数据访问和恢复验证。ASR 跨区域仅做设计时必须注明未实施。",
        "verify": "能独立解释选型，不把设计当成已完成灾备演练。"
      },
      {
        "title": "验收清理",
        "body": "先删除订阅级采集、实验角色，检查锁、备份和保留依赖，再删专用组。按 Project 与命名前缀搜索全部资源，记录费用复查时间。",
        "verify": "只有实际删除才勾选，等待保留的资源有明确到期日和待办。"
      }
    ],
    "deliverables": [
      "架构图、模板、资源与权限清单。",
      "三个故障记录、实际告警、文件恢复证据。",
      "五分钟讲解笔记与费用/清理结果。"
    ],
    "cleanup": [
      "移除订阅采集、实验预算与角色分配。",
      "处理锁、备份保留与可选扩展依赖。",
      "删除专用组及不属于资源组的实验身份对象。",
      "所有清理实际完成后再标记综合项目完成。"
    ],
    "sources": [
      {
        "label": "Microsoft 官方 AZ-104 实验目录",
        "url": "https://microsoftlearning.github.io/AZ-104-MicrosoftAzureAdministrator/"
      },
      {
        "label": "Bicep 部署",
        "url": "https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-cli"
      },
      {
        "label": "Azure Monitor 活动日志告警",
        "url": "https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-create-activity-log-alert-rule"
      }
    ]
  }
];

