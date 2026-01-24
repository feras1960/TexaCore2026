/**
 * Simple Test Component
 * للتحقق من أن React يعمل
 */

/* eslint-disable i18next/no-literal-string -- Test component */
export default function AppTest() {
  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', minHeight: '100vh' }}>
      <h1 style={{ color: '#000' }}>✅ React يعمل - البرنامج يعمل</h1>
      <p>إذا رأيت هذا، React يعمل بشكل صحيح.</p>
      <p>المشكلة قد تكون في أحد الـ components.</p>
    </div>
  );
}
