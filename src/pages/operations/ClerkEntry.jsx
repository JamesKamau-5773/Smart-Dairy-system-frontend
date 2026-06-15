import FastMilkLog from '../../components/operations/FastMilkLog';

export default function RecordMilk() {
  // ClerkEntry route now hosts the kiosk-optimized FastMilkLog single-screen component.
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <FastMilkLog />
    </div>
  );
}