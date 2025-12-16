"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import HeaderBar from "@/components/crm/EntityList";
import TableLayout, {
  TableRow,
  TableCell,
} from "@/components/crm/table/TableLayout";
import ActionButtons from "@/components/crm/table/EntityDetailHeader";
import CreateDeal from "./components/CreateDealButton";
import Link from "next/link";
import { formatDisplayDateOnly } from "@/app/lib/date";

interface Deal {
  id: number;
  name: string;
  stage: string;
  closeDate: string;
  owner: string[];
  amount: string;
  priority: string;
  createdDate: string;
  description?: string;
  accountName?: string;
  associatedLead?: string;
}

const dealFilters = [
  {
    label: "Deal Owner",
    options: ["Maria Johnson", "Shaimah", "Mizba", "Greeshma", "Sabira", "Shifa"],
  },
  {
    label: "Deal Stage",
    options: [
      "Presentation Scheduled",
      "Qualified to Buy",
      "Contract Sent",
      "Closed Won",
      "Appointment Scheduled",
      "Decision Maker Bought In",
      "Closed Lost",
      "Negotiation",
    ],
  },
];

export default function DealsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deals, setDeals] = useState<Deal[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [selectedStage, setSelectedStage] = useState("");

  // 🔥 NEW: Separate date filters
  const [selectedCloseDate, setSelectedCloseDate] = useState("");
  const [selectedCreatedDate, setSelectedCreatedDate] = useState("");

  const [tempAssociatedLead, setTempAssociatedLead] = useState("");

  const searchParams = useSearchParams();
  const openModal = searchParams.get("openModal");
  const leadName = searchParams.get("leadName");
  const leadId = searchParams.get("leadId");

  const itemsPerPage = 10;

  // Load deals
  useEffect(() => {
    const stored = localStorage.getItem("deals");
    if (stored) {
      const parsed = JSON.parse(stored);
      const normalized = parsed.map((d: any) => ({
        ...d,
        owner: Array.isArray(d.owner) ? d.owner : [d.owner].filter(Boolean),
      }));
      setDeals(normalized);
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "deals") {
        const updated = e.newValue ? JSON.parse(e.newValue) : [];
        setDeals(
          updated.map((d: any) => ({
            ...d,
            owner: Array.isArray(d.owner) ? d.owner : [d.owner].filter(Boolean),
          }))
        );
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Open modal from Lead convert page
  useEffect(() => {
    if (openModal === "true") {
      setTempAssociatedLead(leadName || "");
      setModalMode("create");
      setSelectedDeal(null);
      setIsModalOpen(true);
    }
  }, [openModal, leadName]);

  // SAVE DEAL
  const handleSaveDeal = (dealData: Omit<Deal, "id">) => {
    let updatedDeals: Deal[];

    // ❗ Remove createdDate from dealData to avoid overrides
    const { createdDate, ...dealWithoutDate } = dealData;

    const newDeal: Deal = {
      id: Date.now(),
      createdDate: new Date().toISOString(), // 🔥 Always set created date
      ...dealWithoutDate,
      associatedLead: tempAssociatedLead || dealData.associatedLead || "",
    };

    updatedDeals = [newDeal, ...deals];

    setDeals(updatedDeals);
    localStorage.setItem("deals", JSON.stringify(updatedDeals));
    window.dispatchEvent(new Event("storage"));

    // Convert lead if needed
    if (leadId || newDeal.associatedLead) {
      const storedLeads = localStorage.getItem("leads");
      if (storedLeads) {
        const leads = JSON.parse(storedLeads);
        const updatedLeads = leads.map((l: any) => {
          const fullName = `${l.firstName} ${l.lastName}`;
          if (
            String(l.id) === String(leadId) ||
            fullName === newDeal.associatedLead
          ) {
            return { ...l, converted: true };
          }
          return l;
        });

        localStorage.setItem("leads", JSON.stringify(updatedLeads));
        window.dispatchEvent(new Event("storage"));
      }
    }

    setIsModalOpen(false);
    setSelectedDeal(null);
    setModalMode("create");
    setTempAssociatedLead("");
  };

  // EDIT
  const handleEdit = (deal: Deal) => {
    setModalMode("edit");
    setSelectedDeal(deal);
    setIsModalOpen(true);
  };

  // DELETE
  const handleDelete = (deal: Deal) => {
    const updated = deals.filter((d) => d.id !== deal.id);
    setDeals(updated);
    localStorage.setItem("deals", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  };

  const handleCreate = () => {
    setTempAssociatedLead("");
    setModalMode("create");
    setSelectedDeal(null);
    setIsModalOpen(true);
  };

  // FILTERING
  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      deal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.owner.some((o) =>
        o.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesOwner = selectedOwner ? deal.owner.includes(selectedOwner) : true;

    const matchesStage = selectedStage ? deal.stage === selectedStage : true;

    const matchesCloseDate = selectedCloseDate
  ? deal.closeDate.slice(0, 10) === selectedCloseDate
  : true;

const matchesCreatedDate = selectedCreatedDate
  ? deal.createdDate.slice(0, 10) === selectedCreatedDate
  : true;


    return (
      matchesSearch &&
      matchesOwner &&
      matchesStage &&
      matchesCloseDate &&
      matchesCreatedDate
    );
  });

  // pagination
  useEffect(() => {
    const calculatedTotalPages = Math.ceil(filteredDeals.length / itemsPerPage);
    setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);
    if (currentPage > calculatedTotalPages) {
      setCurrentPage(1);
    }
  }, [filteredDeals.length, currentPage]);

  const currentPageDeals = filteredDeals.slice(
    (currentPage - 1) * itemsPerPage,
    (currentPage - 1) * itemsPerPage + itemsPerPage
  );

  const columns = [
    { key: "checkbox", label: "" },
    { key: "name", label: "DEAL NAME" },
    { key: "stage", label: "DEAL STAGE" },
    { key: "closeDate", label: "CLOSE DATE" },
    { key: "owner", label: "DEAL OWNER" },
    { key: "amount", label: "AMOUNT" },
    { key: "associatedlead", label: "Associated Lead" },
    { key: "actions", label: "ACTIONS" },
  ];

  return (
    <div className="bg-white m-2 rounded-md overflow-hidden">
      <HeaderBar
        title="Deals"
        searchPlaceholder="Search phone,name,city"
        onSearch={setSearchTerm}
        filters={dealFilters}
        onFilterChange={(label, val) => {
          if (label === "Deal Owner") setSelectedOwner(val);
          else if (label === "Deal Stage") setSelectedStage(val);
          else if (label === "Close Date") setSelectedCloseDate(val);
          else if (label === "Created Date") setSelectedCreatedDate(val);
        }}
        onDateChange={() => {}} // required prop but unused
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onCreate={handleCreate}
        activeFilters={{
          "Deal Owner": selectedOwner,
          "Deal Stage": selectedStage,
          "Close Date": selectedCloseDate,
          "Created Date": selectedCreatedDate,
        }}
        isDealPage={true}
      />

      <CreateDeal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDeal(null);
          setModalMode("create");
        }}
        onSave={handleSaveDeal}
        initialData={modalMode === "edit" ? selectedDeal || undefined : undefined}
        mode={modalMode}
        associatedLead={tempAssociatedLead}
      />

      <div className="px-4">
        <TableLayout columns={columns}>
          {currentPageDeals.length > 0 ? (
            currentPageDeals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell isCheckbox>
                  <input type="checkbox" className="h-4 w-4" />
                </TableCell>

                <TableCell>
                  <Link
                    href={`/dashboard/modules/deals/${deal.id}`}
                    onClick={() =>
                      localStorage.setItem("deals", JSON.stringify(deals))
                    }
                    className="hover:underline cursor-pointer"
                  >
                    {deal.name}
                  </Link>
                </TableCell>

                <TableCell>{deal.stage}</TableCell>
                <TableCell>{formatDisplayDateOnly(deal.closeDate)}</TableCell>
                <TableCell>{deal.owner.join(", ")}</TableCell>
                <TableCell>{deal.amount}</TableCell>
                <TableCell>{deal.associatedLead || "-"}</TableCell>

                <TableCell>
                  <ActionButtons
                    item={deal}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <div className="py-4 text-gray-500 text-center">No deals found</div>
              </TableCell>
            </TableRow>
          )}
        </TableLayout>
      </div>
    </div>
  );
}
