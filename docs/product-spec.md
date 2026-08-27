# ProofMesh Product Specification

## Product vision

ProofMesh هو استوديو محلي أولًا للتحقق من الأدلة التي تنتجها أنظمة الذكاء الاصطناعي أثناء التنفيذ. لا يحاول أن يكون منصة tracing جديدة؛ بل يقرأ execution claims من مصادر متعددة، يربطها في claim graph، يفحص اكتمالها وسلامتها، يصنف ما يمكن إعادة تشغيله، ويصدر تقريرًا يمكن مراجعته في CI أو أثناء incident review.

## Problem statement

تُظهر أدوات observability أن النموذج أو الوكيل نفذ سلسلة من الخطوات، لكنها لا تجيب دائمًا عن أسئلة التحقيق: هل الملف الذي نراه هو نفسه الذي تم توقيعه؟ هل القرار مرتبط فعلًا بالطلب والأثر الناتج؟ أي أجزاء من السجل قابلة للتحقق دون ثقة في خادم خارجي؟ وما الادعاءات التي ينقصها دليل؟ إعادة تشغيل التنفيذ وحدها ليست كافية، لأن replay وtrace viewer موجودان كفئات مستقلة؛ الفجوة هي **طبقة تحقق مستقلة وقابلة للتشغيل محليًا** تتعامل مع الادعاء ككائن قابل للفحص.

## Target users

المستخدم الأساسي هو مهندس منصة أو AI engineer يحتاج إلى إضافة بوابة تحقق إلى CI أو incident workflow. المستخدم الثانوي هو maintainer لأداة agent أو observability يريد تصدير evidence إلى صيغة مشتركة دون نقل نظامه إلى SaaS آخر. المستخدم الثالث هو الباحث أو reviewer الذي يريد فحص bundle محليًا وإعادة إنتاج قرار التحقق دون صلاحيات على البنية الأصلية.

## Core use cases

| Use case | Outcome |
|---|---|
| Verify a local evidence bundle | تقرير pass/fail يوضح سلامة hash، اكتمال claim graph، وصحة التوقيع المعلن |
| Inspect one claim | عرض المصدر، predicate، أثر الأداة، والأدلة الناقصة مع الحفاظ على سياق الرسم |
| Classify replayability | تصنيف كل عقدة إلى deterministic أو recorded-only أو non-replayable مع السبب |
| Run a conformance check | مجموعة قواعد قابلة للتشغيل على bundle وتخرج machine-readable result |
| Export a review artifact | JSON وMarkdown جاهزان للتعليق في CI أو الإرفاق بتذكرة incident |
| Consume existing standards | قبول حقول متوافقة مع OTel GenAI وSLSA/in-toto دون إنشاء tracing schema منافس |

## User stories

- بصفتي مهندس منصة، أريد تشغيل `proofmesh verify bundle.json` دون اتصال خارجي كي أضعه في CI دون تسريب بيانات التنفيذ.
- بصفتي مطور agent، أريد معرفة claim الناقص قبل أن أعتمد run على أنه reproducible.
- بصفتي reviewer، أريد فتح artifact واحد وفهم العلاقة بين input وtool call وpolicy decision وoutput.
- بصفتي maintainer، أريد إضافة rule جديدة دون تعديل parser أو واجهة العرض.

## Functional requirements

1. يجب أن يحمّل النظام evidence bundle بصيغة JSON مع schema version واضح.
2. يجب أن ينشئ content digest ثابتًا لكل claim اعتمادًا على canonical JSON.
3. يجب أن يتحقق من graph references وعدم وجود عقد يتيمة أو دورات غير معلنة.
4. يجب أن يطبق قواعد completeness على input، model decision، tool effect، policy decision، output، وsignature metadata.
5. يجب أن يميز النتائج إلى `pass`, `review`, و`block` مع reasons قابلة للتتبع.
6. يجب أن يوفر replayability classification على مستوى claim، لا على مستوى run فقط.
7. يجب أن يعرض تقريرًا بصريًا قابلًا للقراءة، ونتيجة JSON قابلة للتكامل.
8. يجب أن يعمل المثال الأساسي بالكامل محليًا داخل المتصفح دون API أو حساب.
9. يجب أن تكون حالات الفشل صريحة، ولا يجوز أن تظهر bundle غير صالحة كأنها verified.

## Non-functional requirements

| Area | Requirement |
|---|---|
| Privacy | لا يرسل التطبيق bundle إلى خدمة خارجية؛ المعالجة الأساسية client-side |
| Determinism | نفس bundle والقواعد تعطيان نفس digest ونفس الحكم |
| Performance | التحقق من bundle تجريبي متوسط أقل من 100ms في المتصفح، مع قابلية paging لاحقًا |
| Accessibility | تنقل كامل بلوحة المفاتيح، focus visible، contrast مناسب، وreduced motion |
| Security | لا يوجد تنفيذ لأوامر أو tool calls أثناء التحقق؛ parser يقرأ بيانات فقط |
| Extensibility | قواعد التحقق وpredicate adapters منفصلة عن renderer |
| Operability | كل نتيجة تتضمن rule id وseverity وpath بدل رسالة عامة |

## MVP المنفذ

يشمل MVP صيغة bundle صغيرة، canonical digest، claim graph، rule engine، تصنيف replayability، تقرير pass/review/block، واجهة dashboard محلية، شاشة claim inspector، وexport JSON/Markdown من الواجهة. يتضمن مثالًا صالحًا وآخر يحتوي على claim ناقص كي يكون مسار الفشل قابلًا للتجربة.

## Advanced features

سيأتي بعد MVP adapter لـ OTel GenAI events، DSSE/in-toto envelope parsing، توقيع Ed25519 حقيقي، CLI مستقل، GitHub Action، وconformance fixtures versioned. هذه العناصر موثقة كعقود توسعة لكن لا تُعرض في MVP كأنها منفذة.

## Future roadmap

المرحلة التالية تضيف policy packs للمؤسسات، differential verification بين runين، offline replay harness، دعم MCP traces، وواجهة plugin للـ predicate types. أما التخزين الجماعي، multi-tenant SaaS، وربط secrets فخارج فلسفة المنتج الأولية لأنها تضعف offline-first boundary.

## Success metrics

نجاح MVP يقاس بقدرة مستخدم جديد على تحميل المثال، فهم سبب الحكم خلال أقل من دقيقتين، وتصدير report صالح للمشاركة. هندسيًا يجب أن تمر اختبارات parser وdigest وrules، وأن لا يحتوي التطبيق على network request لمعالجة bundle، وأن يكون المثال الفاشل مفيدًا لا مجرد رسالة خطأ.

## Explicit non-goals

ProofMesh ليس trace viewer، ولا LLM evaluator، ولا policy enforcement runtime، ولا replay proxy، ولا منصة امتثال قانوني شاملة. هذه الحدود تمنع التداخل مع MLflow وLangfuse وMicrosoft Agent Governance Toolkit وNovaFabric وEuConform.
