<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bin;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BinController extends Controller
{
    private function rules(): array
    {
        return [
            'location' => ['required', 'string', 'max:150'],
            'area' => ['required', 'string', 'max:100'],
            // Optional map position. Both or neither.
            'latitude' => ['nullable', 'required_with:longitude', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'required_with:latitude', 'numeric', 'between:-180,180'],
            'capacity_kg' => ['required', 'numeric', 'min:1', 'max:9999'],
            'current_level' => ['required', 'in:Low,Medium,High,Full'],
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $bins = Bin::query()
            ->when($request->query('keyword'), fn ($q, $kw) => $q->where(fn ($q) => $q->where('location', 'like', "%$kw%")->orWhere('area', 'like', "%$kw%")))
            ->when($request->query('level'), fn ($q, $v) => $q->where('current_level', $v))
            ->orderBy('id')
            ->get();

        return response()->json($bins);
    }

    public function store(Request $request): JsonResponse
    {
        $bin = Bin::create($request->validate($this->rules()));
        Audit::log('created', "Added bin '{$bin->location}'", $bin);

        return response()->json($bin, 201);
    }

    public function update(Request $request, Bin $bin): JsonResponse
    {
        $before = Audit::snapshot($bin);
        $bin->update($request->validate($this->rules()));
        Audit::log('updated', "Edited bin '{$bin->location}' (".Audit::diff($before, $bin).')', $bin);

        return response()->json($bin);
    }

    public function destroy(Bin $bin): JsonResponse
    {
        $bin->delete();
        Audit::log('deleted', "Deleted bin '{$bin->location}'", $bin);

        return response()->json(['message' => 'Bin deleted.']);
    }
}
