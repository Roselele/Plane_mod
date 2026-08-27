/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors.
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState, useCallback, useEffect } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { EmptyStateCompact } from "@plane/propel/empty-state";
import { EditIcon, PlusIcon, TrashIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IIndustry } from "@plane/types";
import { Input, Loader, TextArea } from "@plane/ui";
// components
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { PageHead } from "@/components/core/page-title";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { SettingsHeading } from "@/components/settings/heading";
// hooks
import { useIndustry } from "@/hooks/store/use-industry";
import { useUserPermissions } from "@/hooks/store/user";
// local imports
import { IndustriesProjectSettingsHeader } from "./header";

function IndustriesSettingsPage() {
  const { workspaceSlug } = useParams();
  const { t } = useTranslation();
  // store hooks
  const { workspaceUserInfo, allowPermissions } = useUserPermissions();
  const { workspaceIndustries, fetchIndustries, createIndustry, updateIndustry, deleteIndustry, fetched } =
    useIndustry();
  // state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // derived values
  const canPerformProjectMemberActions = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT
  );
  const isEditable = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT
  );

  const fetch = useCallback(async () => {
    if (!workspaceSlug) return;
    try {
      await fetchIndustries(workspaceSlug.toString());
    } catch (error) {
      console.error("Failed to fetch industries:", error);
    }
  }, [workspaceSlug, fetchIndustries]);

  // initial fetch
  useEffect(() => {
    if (workspaceSlug && !fetched) {
      fetch();
    }
  }, [workspaceSlug, fetched, fetch]);

  const handleSubmit = async () => {
    if (!workspaceSlug || !name.trim()) return;
    setIsSubmitting(true);
    const payload = { name: name.trim(), description: description.trim() || undefined };
    try {
      if (editingId) {
        await updateIndustry(workspaceSlug.toString(), editingId, payload);
        setToast({ type: TOAST_TYPE.SUCCESS, title: t("project_settings.industries.toast_updated_title"), message: t("project_settings.industries.toast_updated_message") });
      } else {
        await createIndustry(workspaceSlug.toString(), payload);
        setToast({ type: TOAST_TYPE.SUCCESS, title: t("project_settings.industries.toast_created_title"), message: t("project_settings.industries.toast_created_message", { name: name.trim() }) });
      }
      setName("");
      setDescription("");
      setShowForm(false);
      setEditingId(null);
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: t("project_settings.industries.toast_error_title"), message: t("project_settings.industries.toast_error_message") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (industry: IIndustry) => {
    setEditingId(industry.id);
    setName(industry.name);
    setDescription(industry.description || "");
    setShowForm(true);
  };

  const handleDelete = async (industryId: string) => {
    if (!workspaceSlug) return;
    try {
      await deleteIndustry(workspaceSlug.toString(), industryId);
      setToast({ type: TOAST_TYPE.SUCCESS, title: t("project_settings.industries.toast_deleted_title"), message: t("project_settings.industries.toast_deleted_message") });
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: t("project_settings.industries.toast_delete_error_title"), message: t("project_settings.industries.toast_delete_error_message") });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setDescription("");
  };

  if (workspaceUserInfo && !canPerformProjectMemberActions) {
    return <NotAuthorizedView section="settings" isProjectView className="h-auto" />;
  }

  const industries = workspaceIndustries ?? [];

  return (
    <SettingsContentWrapper header={<IndustriesProjectSettingsHeader />}>
      <PageHead title={t("project_settings.industries.label")} />
      <div className="w-full">
        <SettingsHeading
          title={t("project_settings.industries.heading")}
          description={t("project_settings.industries.description")}
          control={
            isEditable && !showForm ? (
              <Button variant="primary" size="lg" onClick={() => setShowForm(true)}>
                <PlusIcon className="h-3.5 w-3.5" />
                {t("project_settings.industries.add")}
              </Button>
            ) : undefined
          }
        />
        <div className="mt-6 w-full space-y-3">
          {/* Inline create/edit form */}
          {showForm && (
            <div className="rounded-sm border border-subtle bg-surface-1 p-3.5">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder={t("project_settings.industries.name_placeholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full"
                  autoFocus
                />
                <TextArea
                  placeholder={t("project_settings.industries.description_placeholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-14 w-full resize-none text-13"
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={!name.trim() || isSubmitting}
                  >
                    {isSubmitting ? t("project_settings.industries.saving") : editingId ? t("project_settings.industries.save") : t("project_settings.industries.create")}
                  </Button>
                  <Button variant="secondary" size="lg" onClick={handleCancel} disabled={isSubmitting}>
                    {t("project_settings.industries.cancel")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {!fetched ? (
            <Loader className="space-y-3">
              <Loader.Item height="46px" />
              <Loader.Item height="46px" />
              <Loader.Item height="46px" />
            </Loader>
          ) : industries.length === 0 && !showForm ? (
            /* Empty state */
            <EmptyStateCompact
              assetKey="label"
              assetClassName="size-20"
              title={t("project_settings.industries.empty_title")}
              description={t("project_settings.industries.empty_description")}
              actions={
                isEditable
                  ? [
                      {
                        label: t("project_settings.industries.empty_button"),
                        onClick: () => setShowForm(true),
                      },
                    ]
                  : undefined
              }
              align="start"
              rootClassName="py-20"
            />
          ) : (
            /* List */
            industries.map((industry) => (
              <div
                key={industry.id}
                className="group flex items-center justify-between gap-2 rounded-sm border border-subtle bg-surface-1 px-3.5 py-3"
              >
                <div className="flex items-center gap-2 px-1">
                  <div className="min-h-5 px-2">
                    <h6 className="text-13 font-medium text-primary">{industry.name}</h6>
                    {industry.description && (
                      <p className="mt-0.5 text-11 text-secondary">{industry.description}</p>
                    )}
                  </div>
                </div>
                {isEditable && (
                  <div className="hidden items-center gap-1 group-hover:flex">
                    <button
                      className="flex h-5 w-5 flex-shrink-0 cursor-pointer items-center justify-center rounded-sm text-secondary transition-colors hover:bg-layer-1 hover:text-primary"
                      onClick={() => handleEdit(industry)}
                    >
                      <EditIcon className="h-3 w-3" />
                    </button>
                    <button
                      className="flex h-5 w-5 flex-shrink-0 cursor-pointer items-center justify-center rounded-sm text-secondary transition-colors hover:bg-layer-1 hover:text-red-500"
                      onClick={() => handleDelete(industry.id)}
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </SettingsContentWrapper>
  );
}

export default observer(IndustriesSettingsPage);
