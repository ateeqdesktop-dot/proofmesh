# ProofMesh Flagship Plan

## القرار

بعد تدقيق الحساب والبحث في الأدوات المفتوحة المصدر، سيكون **ProofMesh** المشروع الرئيسي، لكن ليس بوصفه تطبيقًا تجريبيًا جديدًا. سيُرفع من MVP بصري إلى **طبقة تحقق مستقلة للأدلة القابلة للتوقيع وإعادة التشغيل لوكلاء الذكاء الاصطناعي**. هذا القرار أفضل من إنشاء مستودع جديد لأن ProofMesh يملك بالفعل حدودًا منتجية صحيحة، نموذج claims، محرك تحقق، CLI أولي، واجهة محلية، واختبارات؛ بينما القيمة المفقودة هي تحويل الوعود الموثقة في roadmap إلى تكاملات قابلة للاستخدام.

> ProofMesh لا يراقب الوكيل بدلًا من أدوات observability، ولا يفرض السياسة بدلًا من runtime governance؛ بل يتحقق independently من أن الأدلة المصدرة كافية، سليمة، قابلة للتتبع، ومعلّمة بوضوح بما إذا كانت موقعة أو قابلة لإعادة التشغيل.

## الفجوة والتميّز

تتنافس أدوات السوق على traces وevals وprompts وdashboards، بينما تغطي أدوات الحوكمة policy enforcement وsandboxing. الفجوة العملية هي artifact محلي محايد يمكن مراجعته خارج النظام المنتج، مع فصل صريح بين integrity وauthenticity وreplayability. لذلك سيجمع ProofMesh بين canonical hashing، توقيع Ed25519 فعلي، سلسلة claims، فحص DSSE-like envelope محدود وواضح، differential verification، وتصدير SARIF/Markdown/GitHub Action.

## المستخدمون وحالات الاستخدام

المستخدم الأساسي هو مهندس منصة يضيف بوابة تحقق offline إلى CI. المستخدم الثاني هو maintainer لأداة agent أو MCP أو observability يريد تصدير evidence دون نقل بياناته إلى SaaS. المستخدم الثالث هو reviewer أو incident responder يريد فتح artifact واحد ومعرفة: ما الذي حدث؟ ما القرار الذي سمح بالفعل؟ ما الذي تم توقيعه؟ ما الذي يمكن إعادة تشغيله؟ وما الذي يجب اعتباره review بدل pass؟

| Use case | Product outcome |
|---|---|
| `proofmesh verify run.json` | حكم pass/review/block ثابت مع findings قابلة للتتبع |
| `proofmesh sign run.json` | envelope Ed25519 محلي، دون رفع البيانات |
| `proofmesh verify --signature` | فصل واضح بين سلامة digest وصحة التوقيع وثقة المفتاح |
| `proofmesh diff before.json after.json` | كشف تغيّر claims أو policy decisions أو replayability |
| GitHub Action | تعليق/نتيجة SARIF دون تسريب payloads |
| OTel import | تحويل spans المختارة إلى claims دون اختراع tracing backend |

## نطاق الإصدار flagship v0.3

سيُنفّذ الإصدار الأساسي فعليًا عبر ستة محاور: مكتبة domain مشتركة، CLI ناضج، توقيع Ed25519 باستخدام Web Crypto/Node crypto، differential verification، OTel JSON adapter passive، وGitHub Action قابلة لإعادة الاستخدام. ستظل المعالجة local-first، ولن تنفذ bundle data أو تتصل بالشبكة أو تحمل plugins.

### العقد الأساسية

| Contract | Decision |
|---|---|
| Bundle | JSON versioned، canonicalized قبل digest |
| Claim identity | stable `id`، و`sha256` canonical digest |
| Verdict | `pass`, `review`, `block` |
| Signature state | `unsigned`, `declared`, `verified`, `invalid`, `unknown-key` |
| Replayability | `deterministic`, `recorded-only`, `non-replayable` مع سبب إلزامي |
| Exit codes | `0` pass، `1` review، `2` block/invalid/unreadable |
| Trust | explicit public key supplied by user؛ لا تُستنتج الثقة من label |
| Adapter boundary | input data only؛ لا network، no execution، no model invocation |

## المعمارية

```text
┌──────────────────────────────────────────────────────────┐
│ CLI / Browser UI / GitHub Action / future SDKs            │
└───────────────┬──────────────────────────────────────────┘
                │ shared domain API
┌───────────────▼──────────────────────────────────────────┐
│ Parser → Canonicalizer → Digest → Graph Rules → Verdict   │
│                         │                                  │
│                         ├→ Signature verifier              │
│                         ├→ Replayability classifier        │
│                         ├→ Differential verifier            │
│                         └→ SARIF / Markdown serializers     │
└───────────────┬──────────────────────────────────────────┘
                │ passive adapters
      OTel JSON / MCP export / signed envelope
```

الطبقات لا تستدعي بعضها عكسيًا: renderer لا يعرف قواعد التحقق، adapter لا يقرر verdict، والتوقيع لا يساوي authenticity ما لم يُقدم trust root صريح. كل finding تحمل `ruleId`, `severity`, `claimId`, `path`, و`detail`، كي تكون النتيجة قابلة للاستهلاك آليًا وشرحها للبشر.

## نموذج الأمان

تُعامل كل bundle كمدخل غير موثوق. يمنع parser prototype pollution عبر التحقق الصريح من الأنواع، ويمنع canonicalizer اختلافات الترتيب، ولا يتبع URLs أو يشغّل أوامر أو يستورد كودًا من الملف. digest يثبت ثبات bytes canonicalized فقط. signature يثبت أن bytes وقّعها مفتاح خاص مقابل public key محدد. لا يثبت أي منهما أن الحدث الخارجي كان صادقًا؛ لذلك تبقى provenance وexternal effect claims منفصلة، وتتحول الأدلة غير القابلة للتحقق إلى `review` أو `block` حسب profile.

## الأداء وقابلية التوسع

التحقق خطي تقريبًا في عدد claims والروابط، مع canonicalization مرة واحدة لكل كائن. الإصدار الأول يستهدف آلاف claims في عملية CLI واحدة دون قاعدة بيانات. paging وstreaming وstorage ليست ضمن MVP؛ قابلية التوسع تأتي من pure functions، reports machine-readable، وadapter interfaces، لا من إضافة خدمة مركزية.

## ما بعد MVP

يتبع v0.3 إصدار v0.4 بإضافة conformance fixture packs وMCP adapter وpolicy profiles، ثم v0.5 بإضافة offline replay harness ودليل تكاملات. التخزين متعدد المستأجرين، SaaS dashboard، وربط secrets تبقى خارج النطاق؛ لأنها تضعف جوهر المنتج المستقل والمحلي.

## معايير القبول

يُقبل الإصدار عندما ينجح: اختبار canonical digest عبر order permutations، اختبار signature success/tamper/wrong-key، اختبار graph cycles وmissing references، differential reports، adapter fixtures، CLI exit codes، SARIF schema smoke test، وGitHub Action dry-run. يجب أن يظل `pnpm check`, `pnpm test`, و`pnpm build` ناجحًا، وأن يشرح README المسار السريع خلال أقل من دقيقتين، ويعرض بوضوح ما لا يثبته المنتج.

## قرار استبعاد البدائل

| البديل | القرار | السبب |
|---|---|---|
| Dashboard observability | مستبعد | مزدحم ويتكرر مع TraceSift/ImpactWeave والسوق |
| Runtime firewall/sandbox | مستبعد | يتداخل مع AegisBox/Nexus/Agent Firewall وMicrosoft AGT |
| Replay engine مستقل | مدمج كتصنيف/diff مستقبلًا | ReplayWeave يغطي الجزء الأساسي بالفعل |
| Arabic evaluator | مستبعد كمنتج رئيسي | Mizan يغطيه وهو أقل تنوعًا تقنيًا |
| MCP scanner | يؤجل كadapter/profile | MCP-Forge وSentinel موجودان بالفعل |

## References

[1]: https://www.langchain.com/resources/llm-observability-tools "9 LLM Observability Tools for Production AI Agents"
[2]: https://github.com/microsoft/agent-governance-toolkit "Microsoft Agent Governance Toolkit"
[3]: https://opentelemetry.io/blog/2025/ai-agent-observability/ "AI Agent Observability — OpenTelemetry"
