# ProofMesh v0.3 — Evidence Verification Flagship

## Summary

الإصدار 0.3 يحول ProofMesh من MVP بصري إلى نواة قابلة للاستخدام في CI للتحقق المحلي من أدلة تنفيذ أنظمة الذكاء الاصطناعي. تمت إضافة differential verification، ونموذج صريح لحالات التوقيع، ومساعدات Ed25519 envelope، مع ترقية CLI وتصدير SARIF.

## Delivered

| Area | Delivered behavior |
|---|---|
| Differential verification | يقارن claims حسب stable ID ويصدر added/removed/changed paths بترتيب حتمي |
| Signature semantics | يميز unsigned وdeclared وverified وinvalid وunknown-key |
| Ed25519 helpers | توقيع canonical payload والتحقق منه عبر Web Crypto عند توفير trust root صريح |
| CLI | `verify` و`diff`، JSON/SARIF، وexit codes ثابتة |
| Reporting | يضمّن signature status في تقرير التحقق وخصائص SARIF |
| Regression safety | سبعة اختبارات domain، typecheck، production build |

## Security decisions

وجود `envelope.verified` أو اسم signer في bundle لا يثبت صحة التوقيع. التحقق الحقيقي يتطلب public key يقدمه المستدعي. digest يثبت canonical bytes فقط، ولا يثبت صدق الحدث الخارجي أو سلامة المصدر الأصلي. تبقى المعالجة passive: لا تنفيذ، لا network fetch، لا model calls، ولا plugin loading.

## Known limitations

التوقيع متاح على مستوى domain عبر Web Crypto، لكن CLI لا يزال يستخدم حالة envelope المعلنة ما لم يمرر تكاملًا خاصًا بمفتاح ثقة؛ parsing الكامل لـDSSE/in-toto وOTel adapter وGitHub Action reusable مؤجلة للإصدار التالي. هذه حدود معلنة وليست ميزات مخفية.

## Validation

تم تشغيل `pnpm check` و`pnpm test` و`pnpm build` بنجاح. اختبارات CLI المباشرة غطت bundle صالحًا، bundle غير صالح، diff متكافئًا، وdiff مختلفًا، مع exit codes متوقعة.
