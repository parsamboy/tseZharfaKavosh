# Push Instructions — tseZharfaKavosh G-03..G-06 (up to here is important)

**Bundle:** `/tmp/tseZharfaKavosh.G06.bundle` (contains 14 commits from bootstrap to G-06)
**Commits:** 14 commits, 6 evidence gates (G-03 confirmed, G-04/05/06 candidate)

## Option A — with GitHub Personal Access Token (recommended)

```bash
# in Arena workspace /home/user
git remote set-url origin https://<TOKEN>@github.com/parsamboy/tseZharfaKavosh.git
git push origin main
```

## Option B — via bundle file (download bundle then push locally)

```bash
# download /tmp/tseZharfaKavosh.G06.bundle from Arena
git clone --mirror /path/to/tseZharfaKavosh.G06.bundle tseZharfaKavosh.git
cd tseZharfaKavosh.git
git remote add github https://github.com/parsamboy/tseZharfaKavosh.git
git push github main
```

## Option C — via SSH

```bash
git remote set-url origin git@github.com:parsamboy/tseZharfaKavosh.git
git push origin main
```

After push, GitHub should show 14 commits and files:
- docs/EVIDENCE_LEDGER.md with E-011..E-014
- fixtures/raw/mwAllRows.*.json + g04/g05/g06 fixtures
- src/optionParser, src/snapshot.canonical, src/models/firstModel
- probes/* limited-tests
