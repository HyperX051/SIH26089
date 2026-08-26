const fs = require('fs');

const files = [
  'src/app/worker/page.tsx',
  'src/app/admin/page.tsx'
];

const replacements = {
  'bg-white': 'bg-card',
  'bg-zinc-50': 'bg-background',
  'bg-zinc-100': 'bg-muted',
  'bg-black': 'bg-primary text-primary-foreground',
  'text-zinc-900': 'text-foreground',
  'text-zinc-500': 'text-muted-foreground',
  'text-zinc-400': 'text-muted-foreground/70',
  'text-zinc-300': 'text-muted-foreground/80',
  'text-zinc-800': 'text-foreground',
  'border-zinc-200': 'border-border',
  'border-zinc-800': 'border-border',
  'shadow-\\[8px_8px_0px_rgba\\(228,228,231,1\\)\\]': 'shadow-sm rounded-2xl',
  'shadow-\\[4px_4px_0px_rgba\\(228,228,231,1\\)\\]': 'shadow-sm rounded-2xl',
  'rounded-none': 'rounded-xl',
};

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  for (const [oldClass, newClass] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${oldClass}\\b`, 'g');
    content = content.replace(regex, newClass);
  }
  
  // Custom manual replacements for shadow classes that have special characters
  content = content.replace(/shadow-\[8px_8px_0px_rgba\(228,228,231,1\)\]/g, 'shadow-sm rounded-2xl');
  content = content.replace(/shadow-\[4px_4px_0px_rgba\(228,228,231,1\)\]/g, 'shadow-sm rounded-2xl');

  // Fix the profile header since it was reverted
  if (file.includes('worker/page.tsx')) {
    const oldProfileStr = `              <div className="flex items-center gap-8 mb-10 pb-10 border-b border-border">
                <div className="w-32 h-32 bg-muted border border-border flex items-center justify-center text-5xl overflow-hidden shadow-sm rounded-2xl">
                  {profile?.photoUrl ? (
                    <img src={\`http://localhost:8080\${profile.photoUrl}\`} alt="Worker Photo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-extrabold text-foreground">{user?.name?.[0] || 'W'}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-4xl font-extrabold text-foreground mb-2">{profile?.name || user?.name || "Professional"}</h2>
                  <p className="text-foreground text-lg font-bold flex items-center gap-2">
                    ★ {profile?.rating?.toFixed(1) || "4.9"} / 5.0 Rating
                  </p>
                  <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider mt-2">{profile?.totalJobs || 0} Total Jobs Completed</p>
                </div>
              </div>`;
              
    const newProfileStr = `              <div className="flex items-center gap-6 mb-10">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 rounded-full border-2 border-primary p-1">
                    <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-4xl overflow-hidden">
                      {profile?.photoUrl ? (
                        <img src={\`http://localhost:8080\${profile.photoUrl}\`} alt="Worker Photo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-extrabold text-muted-foreground">{user?.name?.[0] || 'W'}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">{profile?.name || user?.name || "Professional"}</h2>
                  <p className="text-muted-foreground font-medium text-sm mb-3">Active Professional</p>
                  <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    Verified Professional
                  </span>
                </div>
              </div>`;
              
    content = content.replace(oldProfileStr, newProfileStr);
  }

  fs.writeFileSync(file, content);
});

console.log("Done");
