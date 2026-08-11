'use client';

type InstallStep = {
  title: string;
  detail: string;
};

type InstallJourneyProps = {
  appName?: string;
};

export default function InstallJourney({ appName = 'LMS' }: InstallJourneyProps) {
  const steps: InstallStep[] = [
    { title: 'Open the link', detail: 'Users access the app through the provided link and are welcomed into the testing experience.' },
    { title: 'Install the app', detail: 'The app is installed on the device so it behaves like a real school portal experience.' },
    { title: 'Sign in and test', detail: 'Users log in and begin using the platform for a closed testing period.' },
    { title: 'Review and publish', detail: 'Once the testing period is successful, the app is prepared for a full Play Store release.' }
  ];

  return (
    <section style={{ border: '1px solid #e2e8f0', borderRadius: 20, padding: '1rem', background: '#ffffff', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)' }}>
      <p style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#1d4ed8', fontWeight: 700, fontSize: '0.8rem' }}>MVP journey</p>
      <h3 style={{ margin: '0.35rem 0', fontSize: '1.25rem' }}>{appName} installation and testing path</h3>
      <div style={{ display: 'grid', gap: '0.7rem', marginTop: '0.8rem' }}>
        {steps.map((step, index) => (
          <div key={step.title} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: '0.8rem 0.95rem', background: '#f8fafc' }}>
            <strong>{index + 1}. {step.title}</strong>
            <div style={{ color: '#64748b', marginTop: '0.2rem' }}>{step.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
