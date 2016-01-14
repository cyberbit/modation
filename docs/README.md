---
layout: docs
page: Documentation
---

## Release Process
1. Check issues on milestone and ensure they are closed, along with the milestone itself.
2. Draft GitHub release with included changes, under the headers **Spotlight**, **New features**, and **Changes**.
 > For ordering issue numbers, use the **right-weighted** style:
 > - \#33, **#43**: Restructured scripts.
   - \#6, #15, **#45**: Cancelled development on features already built into the new Community structure.
   - **#52**: Pulled support for multiple accounts.
   - \#35, **#56**: New project page! http://cyberbit.github.io/modation
 >
 > If commit hashes are referenced, list those last:
 > - \#26, `5b210ab`: Added Soundcloud-style tool tip to user and group links.
3. Start new `release/x.y(.z)` branch using Git Flow.
4. Update manifest. Increment version to `x.y` for feature releases, `x.y.z` for fixbag releases.
5. Compile scripts using Closure. Switch references in manifest and content pages to minified files.
6. Copy `src` to `rel`. Remove files not applicable to release (i.e., non-minified JS). Commit to release branch.
7. Load `rel` into development Chrome. If problems are found, fix in `develop` and go back to compile step (5).
8. Increment version in `couscous.yml`. Copy GitHub release HTML to `whats-new.twig`, using the headers **What's New**, **What's Changed**, and **What's Fixed**. Commit to release branch. Finish release using Git Flow. Deploy project page using Couscous.
 > If deployment fails, run `git push origin gh-pages` in the temp directory created by Couscous (see [CouscousPHP/Couscous#136](https://github.com/CouscousPHP/Couscous/issues/136#issuecomment-160843835)).
9. Pack and zip project as `project-x.y.z.*`. Add archives to GitHub release, double-check information, and publish release. Tag release merge on `master` with `vx.y.z`.
10. Upload `.zip` to webstore. Update description and screenshots as needed. Publish to webstore.